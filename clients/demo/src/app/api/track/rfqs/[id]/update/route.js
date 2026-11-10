import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { clampString } from "@/lib/validation";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { emitTrackRfqUpdated } from "@/lib/track-integration";
import { loadOwnedTrackRfq } from "@/lib/track-rfq-service";

export const dynamic = "force-dynamic";

/** E2 - add failure details or photos to an open RFQ. */
export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (!["open", "awarded", "in_repair"].includes(rfq.status)) {
      return NextResponse.json({ error: "This RFQ is closed." }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const note = clampString(body?.note, 2000);
    const photos = (Array.isArray(body?.photos) ? body.photos : [])
      .map((u) => clampString(u, 500))
      .filter(Boolean)
      .slice(0, 6);
    if (!note && photos.length === 0) {
      return NextResponse.json({ error: "Add a note or a photo." }, { status: 400 });
    }

    rfq.updateNotes.push({ note, photos, at: new Date() });
    if (photos.length) {
      rfq.failurePhotos = [...(rfq.failurePhotos || []), ...photos].slice(0, 12);
    }
    await rfq.save();

    await emitTrackRfqUpdated(rfq, { note });
    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq) });
  } catch (err) {
    console.error("Track RFQ update POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
