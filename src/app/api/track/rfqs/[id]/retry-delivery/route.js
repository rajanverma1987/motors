import { NextResponse } from "next/server";
import TrackFacility from "@/models/TrackFacility";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { deliverTrackRfq } from "@/lib/track-integration";
import { loadOwnedTrackRfq } from "@/lib/track-rfq-service";

export const dynamic = "force-dynamic";

/**
 * §10 - IQMotorBase unreachable when the RFQ was sent: invitations stay pending
 * and can be redelivered without creating duplicate Leads.
 */
export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const invitationIds = Array.isArray(body?.invitationIds)
      ? body.invitationIds.map((id) => String(id))
      : null;

    const full = await TrackFacility.findById(facility._id);
    const deliveries = await deliverTrackRfq(rfq, { facility: full, invitationIds });
    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq), deliveries });
  } catch (err) {
    console.error("Track RFQ retry delivery:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
