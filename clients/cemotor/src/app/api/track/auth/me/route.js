import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackSessionPayload, trackUnauthorized } from "@/lib/track-auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) {
      return NextResponse.json(trackUnauthorized(), { status: 401 });
    }
    const session = await trackSessionPayload(facility);
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("Track me:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
