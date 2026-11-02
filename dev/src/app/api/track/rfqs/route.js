import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { clampString } from "@/lib/validation";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { deliverTrackRfq } from "@/lib/track-integration";
import {
  buildTrackInvitations,
  buildTrackRfqSnapshots,
  ensureTrackRfqReference,
  isTrackMotorOverPlanLimit,
  trackShopLimitError,
} from "@/lib/track-rfq-service";
import { trackMotorTitle } from "@/lib/track-motor-fields";

export const dynamic = "force-dynamic";

const URGENCIES = ["standard", "emergency"];
const LOGISTICS = ["plant_ships", "shop_pickup", "either"];

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    await connectDB();
    const { searchParams } = new URL(request.url);
    const scope = String(searchParams.get("scope") || "open");
    const query = { facilityId: facility._id };
    if (scope === "open") query.status = { $in: ["open", "awarded", "in_repair", "repaired"] };
    else if (scope === "closed") query.status = { $in: ["closed", "cancelled"] };

    const rfqs = await TrackRfqRequest.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const motorIds = [...new Set(rfqs.map((r) => String(r.motorId)))];
    const motors = motorIds.length
      ? await TrackMotor.find({ _id: { $in: motorIds } })
          .select("manufacturer hp kw voltage status facilityLocation")
          .lean()
      : [];
    const motorMap = new Map(
      motors.map((m) => [
        String(m._id),
        { title: trackMotorTitle(m), status: m.status, location: m.facilityLocation || "" },
      ])
    );

    return NextResponse.json({
      ok: true,
      rfqs: rfqs.map((rfq) => {
        const serialized = serializeTrackRfq(rfq);
        const motor = motorMap.get(serialized.motorId) || null;
        return {
          ...serialized,
          motorTitle: motor?.title || "Motor",
          motorStatus: motor?.status || "",
          motorLocation: motor?.location || "",
        };
      }),
    });
  } catch (err) {
    console.error("Track RFQs GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const body = await request.json().catch(() => ({}));
    const motorId = String(body?.motorId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(motorId)) {
      return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    }
    await connectDB();
    const motor = await TrackMotor.findOne({ _id: motorId, facilityId: facility._id });
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    if (await isTrackMotorOverPlanLimit(facility, motor)) {
      return NextResponse.json(
        {
          error:
            "This motor is over your free plan limit. Upgrade to Pro, or archive another motor, to raise an RFQ for it.",
          code: "MOTOR_LIMIT",
        },
        { status: 402 }
      );
    }
    if (motor.openRfqId) {
      return NextResponse.json(
        { error: "This motor already has an open RFQ.", code: "RFQ_OPEN", rfqId: String(motor.openRfqId) },
        { status: 409 }
      );
    }

    const failureDescription = clampString(body?.failureDescription, 4000);
    if (!failureDescription) {
      return NextResponse.json({ error: "Describe what happened." }, { status: 400 });
    }
    const urgency = URGENCIES.includes(String(body?.urgency || "")) ? String(body.urgency) : "standard";
    const logistics = LOGISTICS.includes(String(body?.logistics || ""))
      ? String(body.logistics)
      : "either";

    const listingIds = Array.isArray(body?.listingIds) ? body.listingIds : [];
    const limitError = trackShopLimitError(facility, listingIds.length);
    if (limitError) {
      return NextResponse.json({ error: limitError, code: "SHOP_LIMIT" }, { status: 402 });
    }
    const { invitations, error } = await buildTrackInvitations({
      facility,
      motor,
      listingIds,
      urgency,
      logistics,
    });
    if (error) return NextResponse.json({ error }, { status: 400 });

    const shareDatasheet = body?.shareDatasheet !== false;
    const shareServiceHistory = body?.shareServiceHistory !== false;
    const shareBudget = body?.shareBudget === true;
    const snapshots = await buildTrackRfqSnapshots({
      facility,
      motor,
      shareDatasheet,
      shareServiceHistory,
    });

    const neededBackByRaw = body?.neededBackBy ? new Date(body.neededBackBy) : null;
    const budgetRaw = Number(body?.budgetLimit);

    const rfq = await TrackRfqRequest.create({
      facilityId: facility._id,
      motorId: motor._id,
      status: "open",
      failureDescription,
      urgency,
      logistics,
      neededBackBy: neededBackByRaw && !Number.isNaN(neededBackByRaw.getTime()) ? neededBackByRaw : null,
      budgetLimit: Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : null,
      failurePhotos: (Array.isArray(body?.failurePhotos) ? body.failurePhotos : [])
        .map((u) => clampString(u, 500))
        .filter(Boolean)
        .slice(0, 6),
      shareDatasheet,
      shareServiceHistory,
      shareBudget,
      ...snapshots,
      invitations,
      sentAt: new Date(),
    });
    ensureTrackRfqReference(rfq);
    await rfq.save();

    motor.status = "awaiting_proposals";
    motor.openRfqId = rfq._id;
    await motor.save();

    const deliveries = await deliverTrackRfq(rfq, { facility });

    return NextResponse.json(
      {
        ok: true,
        rfq: serializeTrackRfq(rfq),
        deliveries,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Track RFQs POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
