import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackMaintenanceLog, {
  TRACK_MAINTENANCE_ACTIVITY_TYPES,
} from "@/models/TrackMaintenanceLog";
import {
  getTrackFacilityFromRequest,
  serializeTrackMaintenanceLog,
  trackUnauthorized,
} from "@/lib/track-auth";
import { clampString } from "@/lib/validation";
import { trackNextDueFromLogs } from "@/lib/track-maintenance";

export const dynamic = "force-dynamic";

async function loadOwnedMotor(facility, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return TrackMotor.findOne({ _id: id, facilityId: facility._id });
}

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

/** Keep the motor's rollup fields in step with its logs. */
async function syncMotorMaintenanceRollup(motor) {
  const logs = await TrackMaintenanceLog.find({ motorId: motor._id })
    .select("activityType performedAt nextDueAt")
    .lean();
  const last = logs.reduce((acc, log) => {
    const at = new Date(log.performedAt || 0).getTime();
    return at > acc ? at : acc;
  }, 0);
  motor.lastMaintenanceAt = last ? new Date(last) : null;
  motor.nextMaintenanceDue = trackNextDueFromLogs(logs);
  await motor.save();
}

export async function GET(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    const logs = await TrackMaintenanceLog.find({ motorId: motor._id })
      .sort({ performedAt: -1 })
      .limit(300)
      .lean();
    return NextResponse.json({ ok: true, logs: logs.map(serializeTrackMaintenanceLog) });
  } catch (err) {
    console.error("Track maintenance GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const activityType = String(body?.activityType || "");
    if (!TRACK_MAINTENANCE_ACTIVITY_TYPES.includes(activityType)) {
      return NextResponse.json({ error: "Pick a maintenance activity type." }, { status: 400 });
    }
    const performedAt = body?.performedAt ? new Date(body.performedAt) : null;
    if (!performedAt || Number.isNaN(performedAt.getTime())) {
      return NextResponse.json({ error: "Enter the date this was performed." }, { status: 400 });
    }
    const nextDueRaw = body?.nextDueAt ? new Date(body.nextDueAt) : null;
    const nextDueAt = nextDueRaw && !Number.isNaN(nextDueRaw.getTime()) ? nextDueRaw : null;

    const doc = await TrackMaintenanceLog.create({
      facilityId: facility._id,
      motorId: motor._id,
      activityType,
      performedAt,
      performedBy: clampString(body?.performedBy, 120),
      insulationResistanceMohm: clampString(body?.insulationResistanceMohm, 40),
      vibrationInPerSec: clampString(body?.vibrationInPerSec, 40),
      temperatureF: clampString(body?.temperatureF, 40),
      notes: clampString(body?.notes, 2000),
      attachments: (Array.isArray(body?.attachments) ? body.attachments : [])
        .map((u) => clampString(u, 500))
        .filter(Boolean)
        .slice(0, 6),
      nextDueAt,
    });

    await syncMotorMaintenanceRollup(motor);
    return NextResponse.json(
      { ok: true, log: serializeTrackMaintenanceLog(doc) },
      { status: 201 }
    );
  } catch (err) {
    console.error("Track maintenance POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
