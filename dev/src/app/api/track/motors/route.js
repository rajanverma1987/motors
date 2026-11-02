import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import {
  getTrackFacilityFromRequest,
  serializeTrackMotor,
  trackUnauthorized,
} from "@/lib/track-auth";
import { canAddMotor } from "@/lib/track-subscription";
import { applyTrackMotorFields, validateTrackMotor } from "@/lib/track-motor-input";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    await connectDB();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("archived") === "1";
    const statusFilter = String(searchParams.get("status") || "").trim();
    const search = String(searchParams.get("q") || "").trim();

    const query = {
      facilityId: facility._id,
      ...(includeArchived ? {} : { archived: { $ne: true } }),
    };
    if (statusFilter) query.status = statusFilter;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { manufacturer: rx },
        { serialNumber: rx },
        { modelNumber: rx },
        { facilityLocation: rx },
        { locationAssetTag: rx },
        { application: rx },
      ];
    }

    const docs = await TrackMotor.find(query).sort({ updatedAt: -1 }).lean();
    const openRfqIds = docs.map((d) => d.openRfqId).filter(Boolean);
    const rfqMap = new Map();
    if (openRfqIds.length) {
      const rfqs = await TrackRfqRequest.find({ _id: { $in: openRfqIds } })
        .select("status invitations urgency")
        .lean();
      for (const rfq of rfqs) {
        const invitations = rfq.invitations || [];
        rfqMap.set(String(rfq._id), {
          id: String(rfq._id),
          status: rfq.status,
          urgency: rfq.urgency,
          invitedCount: invitations.length,
          proposalsReceived: invitations.filter((i) => i.response).length,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      motors: docs.map((doc) => {
        const motor = serializeTrackMotor(doc);
        motor.openRfq = motor.openRfqId ? rfqMap.get(motor.openRfqId) || null : null;
        return motor;
      }),
    });
  } catch (err) {
    console.error("Track motors GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const gate = await canAddMotor(facility);
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: `Free plan allows up to ${gate.limit} motors. Upgrade to Pro for unlimited motors.`,
          code: "MOTOR_LIMIT",
          limit: gate.limit,
          count: gate.count,
        },
        { status: 402 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const draft = applyTrackMotorFields(body, { facilityId: facility._id, powerType: "AC" });
    const error = validateTrackMotor(draft);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await connectDB();
    const doc = await TrackMotor.create(draft);
    return NextResponse.json(
      {
        ok: true,
        motor: serializeTrackMotor(doc),
        serialNumberWarning: draft.serialNumber
          ? ""
          : "No serial number recorded. Serial number is this motor's identity across shops, so add it when you can.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Track motors POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
