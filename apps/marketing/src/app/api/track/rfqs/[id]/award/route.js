import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { serializeTrackRfq, trackIsExpired } from "@/lib/track-rfq";
import { clearTrackAwardOutcomeEvents, emitTrackAwardOutcomes } from "@/lib/track-integration";
import Lead from "@/models/Lead";
import { loadOwnedTrackRfq } from "@/lib/track-rfq-service";

export const dynamic = "force-dynamic";

/** §8.3 - award one proposal, notify everyone, never disclose the winner or price to losers. */
export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq, motor } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (rfq.status !== "open") {
      return NextResponse.json({ error: "This RFQ is no longer open for award." }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const invitationId = String(body?.invitationId || "").trim();
    const invitation = rfq.invitations.id(invitationId);
    if (!invitation) return NextResponse.json({ error: "Shop not found on this RFQ." }, { status: 404 });
    if (!invitation.response) {
      return NextResponse.json({ error: "That shop has not sent a proposal yet." }, { status: 409 });
    }
    if (trackIsExpired(invitation.response.validUntil)) {
      return NextResponse.json(
        { error: "That proposal has expired. Ask the shop for a revision before awarding." },
        { status: 409 }
      );
    }

    rfq.status = "awarded";
    rfq.awardedInvitationId = String(invitation._id);
    rfq.awardedShopName = invitation.shopName || "";
    rfq.awardedAt = new Date();
    for (const inv of rfq.invitations) {
      if (String(inv._id) === String(invitation._id)) {
        inv.status = "awarded";
      } else if (inv.status !== "declined") {
        inv.status = "not_selected";
      }
    }
    await rfq.save();

    if (motor) {
      motor.status = "under_repair";
      motor.currentShopName = invitation.shopName || "";
      motor.currentShopListingId = invitation.listingId || "";
      await motor.save();
    }

    await emitTrackAwardOutcomes(rfq);
    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq) });
  } catch (err) {
    console.error("Track RFQ award POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** §16 D5 - un-awarding is allowed only before the shop has started the job. */
export async function DELETE(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq, motor } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (rfq.status !== "awarded") {
      return NextResponse.json(
        { error: "The shop has already started this job, so the award cannot be undone here." },
        { status: 409 }
      );
    }

    rfq.status = "open";
    rfq.awardedInvitationId = "";
    rfq.awardedShopName = "";
    rfq.awardedAt = null;
    const leadIds = [];
    for (const inv of rfq.invitations) {
      if (["awarded", "not_selected"].includes(inv.status)) {
        inv.status = inv.response ? "proposal_received" : inv.viewedAt ? "viewed" : "invited";
      }
      if (inv.leadId) leadIds.push(inv.leadId);
    }
    await rfq.save();
    await clearTrackAwardOutcomeEvents(rfq._id);
    if (leadIds.length) {
      await Lead.updateMany(
        { _id: { $in: leadIds } },
        { $set: { status: "quoted", lostReason: "", trackAwardedAt: null } }
      );
    }

    if (motor) {
      motor.status = "awaiting_proposals";
      motor.currentShopName = "";
      motor.currentShopListingId = "";
      await motor.save();
    }

    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq) });
  } catch (err) {
    console.error("Track RFQ un-award:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
