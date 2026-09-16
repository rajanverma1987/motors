import { NextResponse } from "next/server";
import TrackMaintenanceLog from "@/models/TrackMaintenanceLog";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { loadOwnedTrackRfq } from "@/lib/track-rfq-service";
import { trackNextDueFromLogs } from "@/lib/track-maintenance";

export const dynamic = "force-dynamic";

/**
 * §9.10 - the plant confirms the motor is back in service: motor to Running,
 * RFQ closed, and maintenance next-due dates recalculated.
 */
export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq, motor } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (!["awarded", "in_repair", "repaired"].includes(rfq.status)) {
      return NextResponse.json(
        { error: "This RFQ is not at a stage where the motor can be returned to service." },
        { status: 409 }
      );
    }

    rfq.status = "closed";
    rfq.closedAt = new Date();
    await rfq.save();

    if (motor) {
      motor.status = "in_service";
      motor.openRfqId = null;
      const logs = await TrackMaintenanceLog.find({ motorId: motor._id })
        .select("activityType performedAt nextDueAt")
        .lean();
      motor.nextMaintenanceDue = trackNextDueFromLogs(logs);
      await motor.save();
    }

    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq) });
  } catch (err) {
    console.error("Track RFQ return-to-service:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
