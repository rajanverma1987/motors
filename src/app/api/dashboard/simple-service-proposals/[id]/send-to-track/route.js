import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";
import { computeSimpleServiceProposalTotals } from "@/lib/simple-service-proposal-form";
import { applyTrackProposalSent } from "@/lib/track-integration";
import { TRACK_SOURCE_SYSTEM, trackLinkedProposalContext } from "@/lib/track-shop-conversion";
import { TRACK_PRICE_BASIS_LABEL } from "@/lib/track-rfq";

export const dynamic = "force-dynamic";

const PRICE_BASIS = Object.keys(TRACK_PRICE_BASIS_LABEL);

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * §9.6 - explicit Send Proposal to IQMotorTrack. Saving a proposal never sends
 * anything; this endpoint is the only path, and it takes the share choices the
 * shop confirmed in the share-selection step.
 */
export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const id = await resolveId(context);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await connectDB();
    const proposal = await SimpleServiceProposal.findOne({ _id: id, createdByEmail: email }).lean();
    if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

    const linked = trackLinkedProposalContext(proposal);
    if (!linked) {
      return NextResponse.json(
        { error: "This proposal is not linked to an IQMotorTrack request." },
        { status: 400 }
      );
    }

    const lead = await Lead.findOne({
      trackInvitationId: linked.invitationId,
      leadSource: "iqmotortrack",
    });
    if (!lead) {
      return NextResponse.json({ error: "The linked IQMotorTrack request is gone." }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));

    const totals = computeSimpleServiceProposalTotals(proposal);
    const totalPrice = num(body?.totalPrice) ?? num(proposal.total) ?? num(totals.total);
    const priceBasis = PRICE_BASIS.includes(String(body?.priceBasis || "")) ? String(body.priceBasis) : "";
    const turnaroundDays = num(body?.turnaroundDays);
    const validUntil = body?.validUntil ? new Date(body.validUntil) : null;

    if (totalPrice === null || totalPrice <= 0) {
      return NextResponse.json({ error: "Enter the total price to send." }, { status: 400 });
    }
    if (!priceBasis) return NextResponse.json({ error: "Pick a price basis." }, { status: 400 });
    if (turnaroundDays === null || turnaroundDays < 0) {
      return NextResponse.json({ error: "Enter the turnaround in working days." }, { status: 400 });
    }
    if (!validUntil || Number.isNaN(validUntil.getTime())) {
      return NextResponse.json({ error: "Enter how long the price stays valid." }, { status: 400 });
    }

    // Optional shares. Nothing here is sent unless the shop opted in.
    const shareLineItems = body?.shareLineItems === true;
    const lineItems = shareLineItems
      ? [
          ...(Array.isArray(proposal.scopeDetails) ? proposal.scopeDetails : []),
          ...(Array.isArray(proposal.otherItems) ? proposal.otherItems : []),
        ]
          .map((line) => ({
            description: clampString(line?.description || line?.item || line?.name, 300),
            amount: num(line?.price),
          }))
          .filter((line) => line.description || line.amount !== null)
          .slice(0, 60)
      : [];

    const shareAttachments = body?.shareAttachments === true;
    const attachments = shareAttachments
      ? (Array.isArray(proposal.attachments) ? proposal.attachments : [])
          .map((row) => String(row?.url || row || "").trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    const result = await applyTrackProposalSent(lead, {
      totalPrice,
      currency: String(body?.currency || "USD").toUpperCase().slice(0, 3),
      priceBasis,
      teardownFee: num(body?.teardownFee),
      turnaroundDays,
      promisedReadyDate: body?.promisedReadyDate ? new Date(body.promisedReadyDate) : null,
      scopeSummary: clampString(body?.scopeSummary, 4000),
      lineItems,
      logisticsIncluded: body?.logisticsIncluded === true,
      logisticsCost: num(body?.logisticsCost),
      warrantyMonths: num(body?.warrantyMonths),
      warrantyCoverage: clampString(body?.warrantyCoverage, 1000),
      validUntil,
      notes: clampString(body?.notes, 4000),
      attachments,
      proposalId: String(proposal._id),
      documentNumber: String(proposal.documentNumber || ""),
    });

    await SimpleServiceProposal.updateOne(
      { _id: proposal._id, createdByEmail: email },
      {
        $set: {
          sourceSystem: TRACK_SOURCE_SYSTEM,
          trackProposalSentAt: new Date(),
          trackProposalVersion: Number(result?.version) || 1,
          trackSharedLineItems: shareLineItems,
        },
      }
    );

    return NextResponse.json({ ok: true, version: Number(result?.version) || 1 });
  } catch (err) {
    console.error("Send proposal to IQMotorTrack error:", err);
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}
