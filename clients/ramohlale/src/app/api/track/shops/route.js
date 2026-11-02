import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { rankTrackShopsForMotor } from "@/lib/track-shop-matching";
import { isTrackPro } from "@/lib/track-subscription";
import { trackMaxShopsPerRfq } from "@/lib/track-rfq";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const { searchParams } = new URL(request.url);
    const motorId = String(searchParams.get("motorId") || "").trim();
    if (!mongoose.Types.ObjectId.isValid(motorId)) {
      return NextResponse.json({ error: "A motor is required to rank shops." }, { status: 400 });
    }
    await connectDB();
    const motor = await TrackMotor.findOne({ _id: motorId, facilityId: facility._id }).lean();
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const shops = await rankTrackShopsForMotor({
      facility,
      motor,
      urgency: String(searchParams.get("urgency") || "standard"),
      logistics: String(searchParams.get("logistics") || "either"),
      search: String(searchParams.get("q") || ""),
    });

    const pro = isTrackPro(facility);
    const max = trackMaxShopsPerRfq(pro);
    return NextResponse.json({
      ok: true,
      shops,
      maxShops: Number.isFinite(max) ? max : null,
      isPro: pro,
    });
  } catch (err) {
    console.error("Track shops GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
