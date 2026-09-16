import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import { checkRateLimit } from "@/lib/rate-limit";
import { clampString } from "@/lib/validation";
import {
  applyTrackDeclinedToQuote,
  applyTrackProposalSent,
  hashTrackEmailToken,
} from "@/lib/track-integration";
import { flattenTrackDatasheet } from "@/lib/track-datasheet";
import { trackSnapshotDisplayGroups } from "@/lib/track-snapshot";
import {
  TRACK_DECLINE_REASONS,
  TRACK_LOGISTICS_LABEL,
  TRACK_PRICE_BASIS_LABEL,
  TRACK_URGENCY_LABEL,
} from "@/lib/track-rfq";

export const dynamic = "force-dynamic";

const PRICE_BASIS = Object.keys(TRACK_PRICE_BASIS_LABEL);
const DECLINE_VALUES = TRACK_DECLINE_REASONS.map((r) => r.value);

async function resolveParams(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return {
    rfqId: String(params?.rfqId || "").trim(),
    invitationId: String(params?.invitationId || "").trim(),
  };
}

/**
 * §9.7 - resolve a no-login shop link. The token is only ever stored hashed, and
 * it is scoped to one invitation, so it cannot be replayed by a different shop.
 */
async function loadInvitation(request, context) {
  const { rfqId, invitationId } = await resolveParams(context);
  const token = String(new URL(request.url).searchParams.get("token") || "").trim();
  if (!mongoose.Types.ObjectId.isValid(rfqId) || !token) {
    return { error: "That link is not valid.", status: 400 };
  }
  await connectDB();
  const rfq = await TrackRfqRequest.findById(rfqId);
  if (!rfq) return { error: "That request no longer exists.", status: 404 };
  const invitation = rfq.invitations.id(invitationId);
  if (!invitation) return { error: "That link is not valid.", status: 404 };
  if (!invitation.emailToken || invitation.emailToken !== hashTrackEmailToken(token)) {
    return { error: "That link is not valid.", status: 403 };
  }
  if (invitation.emailTokenExpiresAt && new Date(invitation.emailTokenExpiresAt).getTime() < Date.now()) {
    return { error: "That link has expired. Ask the plant to resend the request.", status: 410 };
  }
  return { rfq, invitation };
}

/**
 * Record the first use of the link. Re-read the document so the write does not
 * clobber changes the integration appliers just made to the same RFQ.
 */
async function stampTokenUsed(rfqId, invitationId) {
  const fresh = await TrackRfqRequest.findById(rfqId);
  const invitation = fresh?.invitations?.id(invitationId);
  if (!invitation || invitation.emailTokenUsedAt) return;
  invitation.emailTokenUsedAt = new Date();
  await fresh.save();
}

function publicView(rfq, invitation) {
  const snapshot = rfq.motorSnapshot || {};
  const powerType = String(snapshot.powerType || "AC").toUpperCase() === "DC" ? "DC" : "AC";
  return {
    rfqId: String(rfq._id),
    invitationId: String(invitation._id),
    reference: String(rfq.reference || ""),
    status: String(rfq.status || "open"),
    invitationStatus: String(invitation.status || "invited"),
    shopName: String(invitation.shopName || ""),
    closed: !["open"].includes(String(rfq.status || "open")),
    awardedElsewhere:
      Boolean(rfq.awardedInvitationId) && String(rfq.awardedInvitationId) !== String(invitation._id),
    facilityName: String(rfq.facilitySnapshot?.facilityName || ""),
    facilityCity: [rfq.facilitySnapshot?.city, rfq.facilitySnapshot?.state].filter(Boolean).join(", "),
    facilityCountry: String(rfq.facilitySnapshot?.country || ""),
    contactName: String(rfq.facilitySnapshot?.contactName || ""),
    failureDescription: String(rfq.failureDescription || ""),
    urgency: String(rfq.urgency || "standard"),
    urgencyLabel: TRACK_URGENCY_LABEL[String(rfq.urgency || "standard")] || "Standard",
    logisticsLabel: TRACK_LOGISTICS_LABEL[String(rfq.logistics || "either")] || "",
    neededBackBy: rfq.neededBackBy ? new Date(rfq.neededBackBy).toISOString() : null,
    budgetLimit: rfq.shareBudget ? (rfq.budgetLimit ?? null) : null,
    failurePhotos: Array.isArray(rfq.failurePhotos) ? rfq.failurePhotos : [],
    updateNotes: (Array.isArray(rfq.updateNotes) ? rfq.updateNotes : []).map((u) => ({
      note: String(u?.note || ""),
      photos: Array.isArray(u?.photos) ? u.photos : [],
      at: u?.at ? new Date(u.at).toISOString() : null,
    })),
    invitedShopCount: (rfq.invitations || []).length,
    motorTitle: String(snapshot.title || "Motor"),
    motorPhotos: Array.isArray(snapshot.photos) ? snapshot.photos : [],
    motorGroups: trackSnapshotDisplayGroups(snapshot),
    datasheetProvenance: rfq.shareDatasheet ? String(rfq.datasheetSnapshotProvenance || "") : "",
    datasheetGroups:
      rfq.shareDatasheet && rfq.datasheetSnapshot
        ? flattenTrackDatasheet(rfq.datasheetSnapshot, powerType)
        : [],
    serviceHistory: rfq.shareServiceHistory
      ? (Array.isArray(rfq.serviceHistorySummary) ? rfq.serviceHistorySummary : []).map((entry) => ({
          completedAt: entry?.completedAt || null,
          workType: String(entry?.workType || ""),
          description: String(entry?.description || ""),
          failureCause: String(entry?.failureCause || ""),
        }))
      : [],
    response: invitation.response
      ? {
          version: Number(invitation.response.version) || 1,
          totalPrice: invitation.response.totalPrice ?? null,
          currency: String(invitation.response.currency || "USD"),
          priceBasis: String(invitation.response.priceBasis || "fixed"),
          turnaroundDays: invitation.response.turnaroundDays ?? null,
          validUntil: invitation.response.validUntil
            ? new Date(invitation.response.validUntil).toISOString()
            : null,
        }
      : null,
    declineReason: String(invitation.declineReason || ""),
  };
}

export async function GET(request, context) {
  const { allowed } = await checkRateLimit(request, "track-shop-response-view", 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  try {
    const found = await loadInvitation(request, context);
    if (found.error) return NextResponse.json({ error: found.error }, { status: found.status });
    const { rfq, invitation } = found;

    if (!invitation.viewedAt) {
      invitation.viewedAt = new Date();
      if (invitation.status === "invited") invitation.status = "viewed";
      await rfq.save();
      if (invitation.leadId) {
        await Lead.findByIdAndUpdate(invitation.leadId, { $set: { trackViewedAt: invitation.viewedAt } });
      }
    }

    return NextResponse.json({ ok: true, rfq: publicView(rfq, invitation) });
  } catch (err) {
    console.error("Track shop response GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** Submit or revise a proposal, or decline to quote. */
export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "track-shop-response-post", 20);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  try {
    const found = await loadInvitation(request, context);
    if (found.error) return NextResponse.json({ error: found.error }, { status: found.status });
    const { rfq, invitation } = found;

    if (String(rfq.status) !== "open") {
      return NextResponse.json(
        { error: "This request is no longer open for proposals." },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "propose");

    const lead = invitation.leadId ? await Lead.findById(invitation.leadId) : null;
    if (!lead) {
      return NextResponse.json({ error: "This request is not available right now." }, { status: 409 });
    }

    if (action === "decline") {
      const reason = DECLINE_VALUES.includes(String(body?.reason || "")) ? String(body.reason) : "";
      if (!reason) return NextResponse.json({ error: "Please pick a reason." }, { status: 400 });
      const label = TRACK_DECLINE_REASONS.find((r) => r.value === reason)?.label || reason;
      const note = clampString(body?.reasonNote, 400);
      await applyTrackDeclinedToQuote(lead, note ? `${label}: ${note}` : label);
      await stampTokenUsed(rfq._id, invitation._id);
      return NextResponse.json({ ok: true, declined: true });
    }

    const totalPrice = Number(body?.totalPrice);
    const turnaroundDays = Number(body?.turnaroundDays);
    const priceBasis = PRICE_BASIS.includes(String(body?.priceBasis || "")) ? String(body.priceBasis) : "";
    const validUntil = body?.validUntil ? new Date(body.validUntil) : null;

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return NextResponse.json({ error: "Enter your total price." }, { status: 400 });
    }
    if (!priceBasis) return NextResponse.json({ error: "Pick a price basis." }, { status: 400 });
    if (!Number.isFinite(turnaroundDays) || turnaroundDays < 0) {
      return NextResponse.json({ error: "Enter the turnaround in working days." }, { status: 400 });
    }
    if (!validUntil || Number.isNaN(validUntil.getTime())) {
      return NextResponse.json({ error: "Enter how long the price is valid." }, { status: 400 });
    }

    const teardownFee = Number(body?.teardownFee);
    const logisticsCost = Number(body?.logisticsCost);
    const warrantyMonths = Number(body?.warrantyMonths);

    const result = await applyTrackProposalSent(lead, {
      totalPrice,
      currency: String(body?.currency || "USD").toUpperCase().slice(0, 3),
      priceBasis,
      teardownFee: Number.isFinite(teardownFee) && teardownFee >= 0 ? teardownFee : null,
      turnaroundDays,
      promisedReadyDate: null,
      scopeSummary: clampString(body?.scopeSummary, 4000),
      lineItems: [],
      logisticsIncluded: body?.logisticsIncluded === true,
      logisticsCost: Number.isFinite(logisticsCost) && logisticsCost >= 0 ? logisticsCost : null,
      warrantyMonths: Number.isFinite(warrantyMonths) && warrantyMonths > 0 ? warrantyMonths : null,
      warrantyCoverage: clampString(body?.warrantyCoverage, 1000),
      validUntil,
      notes: clampString(body?.notes, 4000),
      attachments: [],
      proposalId: "",
      documentNumber: "",
    });

    await stampTokenUsed(rfq._id, invitation._id);
    return NextResponse.json({ ok: true, version: result?.version || 1 });
  } catch (err) {
    console.error("Track shop response POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
