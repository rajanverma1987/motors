import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, serializeTrackMotor, trackUnauthorized } from "@/lib/track-auth";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { loadOwnedTrackRfq } from "@/lib/track-rfq-service";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq, motor } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      rfq: serializeTrackRfq(rfq),
      motor: motor ? serializeTrackMotor(motor) : null,
    });
  } catch (err) {
    console.error("Track RFQ GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
