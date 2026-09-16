import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackServiceHistory from "@/models/TrackServiceHistory";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { recalcTrackMotorRepairTotals } from "@/lib/track-integration";

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
    const doc = await TrackServiceHistory.findOne({ _id: id, facilityId: facility._id });
    if (!doc) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    if (doc.source === "iqmotorbase") {
      return NextResponse.json(
        { error: "Entries created from a shop job cannot be deleted. They are the shop's record of the work." },
        { status: 409 }
      );
    }
    const motorId = doc.motorId;
    await doc.deleteOne();
    await recalcTrackMotorRepairTotals(motorId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track service history DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
