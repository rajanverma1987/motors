import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { deliverTrackRfq } from "@/lib/track-integration";
import {
  buildTrackInvitations,
  loadOwnedTrackRfq,
  trackShopLimitError,
} from "@/lib/track-rfq-service";

export const dynamic = "force-dynamic";

/**
 * §7.5 - invite additional shops while the RFQ is open and not yet awarded.
 * New shops receive the original snapshot plus any failure updates.
 */
export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq, motor } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq || !motor) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (rfq.status !== "open") {
      return NextResponse.json(
        { error: "Shops can only be added while the RFQ is open and not yet awarded." },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requested = Array.isArray(body?.listingIds) ? body.listingIds : [];
    const alreadyInvited = new Set((rfq.invitations || []).map((i) => String(i.listingId)));
    const listingIds = requested.map((id) => String(id).trim()).filter((id) => id && !alreadyInvited.has(id));
    if (listingIds.length === 0) {
      return NextResponse.json({ error: "Those shops are already invited." }, { status: 400 });
    }

    const limitError = trackShopLimitError(facility, alreadyInvited.size + listingIds.length);
    if (limitError) {
      return NextResponse.json({ error: limitError, code: "SHOP_LIMIT" }, { status: 402 });
    }

    const { invitations, error } = await buildTrackInvitations({
      facility,
      motor,
      listingIds,
      urgency: rfq.urgency,
      logistics: rfq.logistics,
    });
    if (error) return NextResponse.json({ error }, { status: 400 });

    const newIds = [];
    for (const invitation of invitations) {
      rfq.invitations.push(invitation);
      newIds.push(String(rfq.invitations[rfq.invitations.length - 1]._id));
    }
    await rfq.save();

    const deliveries = await deliverTrackRfq(rfq, { facility, invitationIds: newIds });
    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq), deliveries });
  } catch (err) {
    console.error("Track RFQ invite POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
