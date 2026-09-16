import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackMaintenanceLog from "@/models/TrackMaintenanceLog";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import {
  getTrackFacilityFromRequest,
  serializeTrackMotor,
  trackSessionPayload,
  trackUnauthorized,
} from "@/lib/track-auth";
import { TRACK_DUE_SOON_DAYS, trackDueState } from "@/lib/track-maintenance";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { trackMotorTitle } from "@/lib/track-motor-fields";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    await connectDB();

    const baseQuery = { facilityId: facility._id, archived: { $ne: true } };
    const dueCutoff = new Date(Date.now() + TRACK_DUE_SOON_DAYS * 86400000);

    const [motors, openRfqs, dueLogs] = await Promise.all([
      TrackMotor.find(baseQuery).sort({ updatedAt: -1 }).lean(),
      TrackRfqRequest.find({
        facilityId: facility._id,
        status: { $in: ["open", "awarded", "in_repair", "repaired"] },
      })
        .sort({ createdAt: -1 })
        .lean(),
      TrackMaintenanceLog.find({
        facilityId: facility._id,
        nextDueAt: { $ne: null, $lte: dueCutoff },
      })
        .sort({ nextDueAt: 1 })
        .limit(100)
        .lean(),
    ]);

    const counts = { total: motors.length, running: 0, down: 0, underRepair: 0, standby: 0, retired: 0 };
    for (const motor of motors) {
      if (motor.status === "in_service") counts.running += 1;
      else if (motor.status === "down") counts.down += 1;
      else if (["under_repair", "awaiting_proposals", "repaired"].includes(motor.status)) {
        counts.underRepair += 1;
      } else if (motor.status === "spare") counts.standby += 1;
      else if (motor.status === "retired") counts.retired += 1;
    }

    const attention = motors
      .filter((m) => ["down", "awaiting_proposals", "under_repair", "repaired"].includes(m.status))
      .map(serializeTrackMotor);

    const motorNameById = new Map(motors.map((m) => [String(m._id), trackMotorTitle(m)]));

    // Only the newest log per motor + activity type can still be outstanding.
    const latestPerKey = new Map();
    for (const log of dueLogs) {
      const key = `${log.motorId}:${log.activityType}`;
      const prev = latestPerKey.get(key);
      if (!prev || new Date(log.performedAt) > new Date(prev.performedAt)) latestPerKey.set(key, log);
    }
    const maintenanceDue = [...latestPerKey.values()]
      .map((log) => ({
        id: String(log._id),
        motorId: String(log.motorId),
        motorTitle: motorNameById.get(String(log.motorId)) || "Motor",
        activityType: log.activityType,
        nextDueAt: log.nextDueAt ? new Date(log.nextDueAt).toISOString() : null,
        dueState: trackDueState(log.nextDueAt),
      }))
      .filter((row) => row.dueState === "overdue" || row.dueState === "due_soon")
      .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());

    const rfqs = openRfqs.map((rfq) => {
      const serialized = serializeTrackRfq(rfq);
      return {
        ...serialized,
        motorTitle: motorNameById.get(serialized.motorId) || "Motor",
      };
    });

    return NextResponse.json({
      ok: true,
      counts,
      attention,
      openRfqs: rfqs,
      maintenanceDue,
      overdueCount: maintenanceDue.filter((r) => r.dueState === "overdue").length,
      dueSoonCount: maintenanceDue.filter((r) => r.dueState === "due_soon").length,
      session: await trackSessionPayload(facility),
    });
  } catch (err) {
    console.error("Track dashboard GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
