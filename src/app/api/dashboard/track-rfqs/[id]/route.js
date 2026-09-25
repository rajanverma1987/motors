import { NextResponse } from "next/server";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { flattenTrackDatasheet } from "@/lib/track-datasheet";
import { resolveMachineType, machineTypesMatch } from "@/lib/machine-types";
import { trackSnapshotDisplayGroups } from "@/lib/track-snapshot";
import {
  applyTrackLeadViewed,
} from "@/lib/track-integration";
import {
  TRACK_SOURCE_SYSTEM,
  loadTrackLeadForShop,
  trackRfqStateForLead,
} from "@/lib/track-shop-conversion";
import { TRACK_LOGISTICS_LABEL } from "@/lib/track-rfq";

export const dynamic = "force-dynamic";

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

/** §9.4 - Lead detail for an IQMotorTrack request, scoped to this shop only. */
export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await loadTrackLeadForShop(user.email, await resolveId(context));
    if (!lead) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // E4 - first open marks the invitation Viewed in IQMotorTrack.
    await applyTrackLeadViewed(lead).catch((err) =>
      console.warn("Track lead viewed emit failed:", err?.message || err)
    );

    const snapshot = lead.trackMotorSnapshot || {};
    const motorPowerType = resolveMachineType(snapshot.powerType, "AC");
    const sheetPowerType = resolveMachineType(lead.trackDatasheetPowerType || motorPowerType, motorPowerType);
    const powerConflict = Boolean(lead.trackDatasheetSnapshot) && !machineTypesMatch(sheetPowerType, motorPowerType);

    const proposal = lead.trackProposalId
      ? await SimpleServiceProposal.findOne({
          _id: lead.trackProposalId,
          createdByEmail: user.email.trim().toLowerCase(),
        })
          .select("documentNumber recordType status jobStatus sourceSystem")
          .lean()
      : null;

    return NextResponse.json({
      ok: true,
      lead: {
        id: String(lead._id),
        status: String(lead.status || "new"),
        createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : null,
        company: String(lead.trackFacilityName || lead.company || ""),
        contactName: String(lead.name || ""),
        email: String(lead.email || ""),
        phone: String(lead.phone || ""),
        address: String(lead.trackFacilityAddress || ""),
        city: String(lead.city || ""),
        state: String(lead.trackFacilityState || ""),
        zipCode: String(lead.zipCode || ""),
        country: String(lead.trackFacilityCountry || ""),
        urgencyLevel: String(lead.urgencyLevel || ""),
        problemDescription: String(lead.problemDescription || ""),
        logisticsLabel: TRACK_LOGISTICS_LABEL[String(lead.trackLogistics || "")] || "",
        neededBackBy: lead.trackNeededBackBy ? new Date(lead.trackNeededBackBy).toISOString() : null,
        budgetLimit: lead.trackBudgetLimit ?? null,
        photos: Array.isArray(lead.motorPhotos) ? lead.motorPhotos : [],
        invitedShopCount: Number(lead.trackInvitedShopCount) || 0,
        declineReason: String(lead.declineReason || ""),
        motorTitle: String(snapshot.title || "Motor"),
        motorPowerType,
        motorGroups: trackSnapshotDisplayGroups(snapshot),
        motorPhotos: Array.isArray(snapshot.photos) ? snapshot.photos : [],
        datasheetProvenance: String(lead.trackDatasheetProvenance || ""),
        datasheetPowerType: lead.trackDatasheetSnapshot ? sheetPowerType : "",
        datasheetPowerConflict: powerConflict,
        datasheetGroups: lead.trackDatasheetSnapshot
          ? flattenTrackDatasheet(lead.trackDatasheetSnapshot, sheetPowerType)
          : [],
        serviceHistory: Array.isArray(lead.trackServiceHistorySummary)
          ? lead.trackServiceHistorySummary
          : [],
        proposal: proposal
          ? {
              id: String(proposal._id),
              documentNumber: String(proposal.documentNumber || ""),
              recordType: String(proposal.recordType || ""),
              status: String(proposal.status || ""),
              jobStatus: String(proposal.jobStatus || ""),
              linked: String(proposal.sourceSystem || "") === TRACK_SOURCE_SYSTEM,
            }
          : null,
      },
      rfq: await trackRfqStateForLead(lead),
    });
  } catch (err) {
    console.error("Dashboard track RFQ detail error:", err);
    return NextResponse.json({ error: "Failed to load the request" }, { status: 500 });
  }
}
