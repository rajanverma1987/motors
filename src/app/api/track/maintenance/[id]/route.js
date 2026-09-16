import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMaintenanceLog from "@/models/TrackMaintenanceLog";
import TrackMotor from "@/models/TrackMotor";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { trackNextDueFromLogs } from "@/lib/track-maintenance";

export const dynamic = "force-dynamic";

export async function DELETE(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = String(params?.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    await connectDB();
    const doc = await TrackMaintenanceLog.findOne({ _id: id, facilityId: facility._id });
    if (!doc) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    const motorId = doc.motorId;
    await doc.deleteOne();

    const motor = await TrackMotor.findOne({ _id: motorId, facilityId: facility._id });
    if (motor) {
      const logs = await TrackMaintenanceLog.find({ motorId })
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track maintenance DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
