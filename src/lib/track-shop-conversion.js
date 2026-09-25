/**
 * Shop-side handling of IQMotorTrack Leads inside the Simple portal (§9.4 to §9.6, §14).
 *
 * Simple has no Motor collection: motor data lives on the Service Proposal, so
 * conversion produces a Customer plus one RFQ-type Service Proposal. Both are
 * idempotent through `sourceSystem` + `externalRef`, so clicking Convert twice
 * opens the same records instead of duplicating them.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Lead from "@/models/Lead";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import { getListingIdsForUser, leadBelongsToShop } from "@/lib/dashboard-leads-scope";
import { createSimpleServiceProposalWithUniqueJobNumber } from "@/lib/simple-portal-job-numbers";
import { loadMergedSettingsForEmail } from "@/lib/simple-service-proposal-list-query";
import { serializeSimplePortalDoc } from "@/lib/simple-portal-mongo";
import { normalizeTrackDatasheet, trackCoreMeasurementsFromDatasheet } from "@/lib/track-datasheet";
import { machineTypesMatch, resolveMachineType } from "@/lib/machine-types";
import { applyTrackConvertedToProposal } from "@/lib/track-integration";
import { TRACK_LOGISTICS_LABEL, TRACK_URGENCY_LABEL } from "@/lib/track-rfq";
import { nextCustomerNumberForShop } from "@/lib/next-customer-number";

export const TRACK_SOURCE_SYSTEM = "IQMotorTrack";

/** Leads a shop user may act on, newest first. */
export async function listTrackLeadsForShop(email) {
  await connectDB();
  const listingIds = await getListingIdsForUser(email);
  if (listingIds.length === 0) return { listingIds, leads: [] };
  const leads = await Lead.find({ leadSource: "iqmotortrack" }).sort({ createdAt: -1 }).limit(300).lean();
  return { listingIds, leads: leads.filter((lead) => leadBelongsToShop(lead, listingIds, email)) };
}

/** Load one Lead and confirm it belongs to this shop user. */
export async function loadTrackLeadForShop(email, leadId) {
  if (!mongoose.Types.ObjectId.isValid(leadId)) return null;
  await connectDB();
  const lead = await Lead.findById(leadId);
  if (!lead || String(lead.leadSource) !== "iqmotortrack") return null;
  const listingIds = await getListingIdsForUser(email);
  if (!leadBelongsToShop(lead.toObject(), listingIds, email)) return null;
  return lead;
}

/** The plant-side RFQ status a shop is allowed to see: never other shops' data. */
export async function trackRfqStateForLead(lead) {
  if (!lead?.trackRfqRequestId || !mongoose.Types.ObjectId.isValid(lead.trackRfqRequestId)) return null;
  const rfq = await TrackRfqRequest.findById(lead.trackRfqRequestId)
    .select("status awardedInvitationId awardedAt cancelledAt cancelReason invitations reference")
    .lean();
  if (!rfq) return null;
  const invitation = (rfq.invitations || []).find(
    (inv) => String(inv._id) === String(lead.trackInvitationId)
  );
  return {
    reference: String(rfq.reference || ""),
    rfqStatus: String(rfq.status || "open"),
    invitationStatus: String(invitation?.status || "invited"),
    awarded: Boolean(rfq.awardedInvitationId) && String(rfq.awardedInvitationId) === String(lead.trackInvitationId),
    notSelected:
      Boolean(rfq.awardedInvitationId) && String(rfq.awardedInvitationId) !== String(lead.trackInvitationId),
    cancelled: String(rfq.status) === "cancelled",
    cancelReason: String(rfq.cancelReason || ""),
    awardedAt: rfq.awardedAt ? new Date(rfq.awardedAt).toISOString() : null,
    responseVersion: Number(invitation?.response?.version) || 0,
    responseSentAt: invitation?.response?.receivedAt
      ? new Date(invitation.response.receivedAt).toISOString()
      : null,
  };
}

function facilityCompany(lead) {
  return String(lead.trackFacilityName || lead.company || "").trim();
}

/**
 * §9.5 A - match a Customer before creating one. Certain matches are the external
 * reference or an exact company + email domain hit.
 */
export async function findTrackCustomerMatches(email, lead) {
  await connectDB();
  const shopEmail = String(email || "").trim().toLowerCase();
  const facilityId = String(lead.trackFacilityId || "");

  if (facilityId) {
    const linked = await Customer.findOne({
      createdByEmail: shopEmail,
      sourceSystem: TRACK_SOURCE_SYSTEM,
      externalRef: facilityId,
    }).lean();
    if (linked) return { certain: linked, probable: [] };
  }

  const company = facilityCompany(lead);
  const domain = String(lead.email || "").split("@")[1] || "";
  const or = [];
  if (company) or.push({ companyName: new RegExp(`^${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (domain) or.push({ email: new RegExp(`@${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (or.length === 0) return { certain: null, probable: [] };

  const rows = await Customer.find({ createdByEmail: shopEmail, $or: or }).limit(10).lean();
  const exact = rows.filter(
    (row) =>
      String(row.companyName || "").trim().toLowerCase() === company.toLowerCase() &&
      domain &&
      String(row.email || "").toLowerCase().endsWith(`@${domain.toLowerCase()}`)
  );
  if (exact.length === 1) return { certain: exact[0], probable: [] };
  return { certain: null, probable: rows };
}

async function createTrackCustomer(shopEmail, lead) {
  const doc = await Customer.create({
    createdByEmail: shopEmail,
    customerNumber: await nextCustomerNumberForShop(shopEmail),
    companyName: facilityCompany(lead) || "IQMotorTrack customer",
    primaryContactName: String(lead.name || ""),
    email: String(lead.email || ""),
    phone: String(lead.phone || ""),
    address: String(lead.trackFacilityAddress || ""),
    city: String(lead.city || "").split(",")[0].trim(),
    state: String(lead.trackFacilityState || ""),
    zipCode: String(lead.zipCode || ""),
    country: String(lead.trackFacilityCountry || "United States"),
    notes: "Created from an IQMotorTrack motor down request.",
    sourceSystem: TRACK_SOURCE_SYSTEM,
    externalRef: String(lead.trackFacilityId || ""),
    importedAt: new Date(),
  });
  return doc;
}

/** §9.5 motor field mapping, IQMotorTrack snapshot to the Simple proposal fields. */
function motorFieldsFromSnapshot(snapshot) {
  const src = snapshot || {};
  const powerType = resolveMachineType(src.powerType, "AC");
  const hpKw = String(src.hp || "").trim()
    ? `${String(src.hp).trim()} HP`
    : String(src.kw || "").trim()
      ? `${String(src.kw).trim()} kW`
      : "";
  const frameType = [src.frame, src.enclosure].map((v) => String(v || "").trim()).filter(Boolean).join(" / ");
  return {
    motorPower: powerType,
    manufacturer: String(src.manufacturer || ""),
    hpKw,
    frameType,
    modelNumber: String(src.modelNumber || ""),
    volts: String(src.voltage || ""),
    amps: String(src.fullLoadAmps || ""),
    rpm: String(src.rpm || ""),
  };
}

function proposalNotesFromLead(lead) {
  const lines = [
    `Motor down request from ${facilityCompany(lead) || "an IQMotorTrack customer"} via IQMotorTrack.`,
    `Urgency: ${TRACK_URGENCY_LABEL[String(lead.urgencyLevel || "").toLowerCase()] || lead.urgencyLevel || "Standard"}`,
    lead.trackLogistics ? `Logistics: ${TRACK_LOGISTICS_LABEL[lead.trackLogistics] || lead.trackLogistics}` : "",
    lead.trackNeededBackBy
      ? `Needed back by: ${new Date(lead.trackNeededBackBy).toLocaleDateString()}`
      : "",
    lead.trackMotorSnapshot?.serialNumber ? `Serial number: ${lead.trackMotorSnapshot.serialNumber}` : "",
    "",
    String(lead.problemDescription || ""),
  ];
  return lines.filter((line) => line !== undefined).join("\n").trim();
}

/**
 * §9.5 - convert one IQMotorTrack Lead into an RFQ-type Service Proposal.
 *
 * @param {{ email: string, lead: any, customerId?: string, createCustomer?: boolean }} args
 * @returns {Promise<{ ok: boolean, needsCustomerChoice?: boolean, candidates?: unknown[], item?: unknown, existing?: boolean, error?: string }>}
 */
export async function convertTrackLeadToProposal({ email, lead, customerId = "", createCustomer = false }) {
  await connectDB();
  const shopEmail = String(email || "").trim().toLowerCase();
  const invitationId = String(lead.trackInvitationId || "");
  if (!invitationId) return { ok: false, error: "This lead is missing its IQMotorTrack reference." };

  // A second click must open the same proposal (§9.5 C).
  const existing = await SimpleServiceProposal.findOne({
    createdByEmail: shopEmail,
    sourceSystem: TRACK_SOURCE_SYSTEM,
    externalRef: invitationId,
  }).lean();
  if (existing) {
    return { ok: true, existing: true, item: serializeSimplePortalDoc(existing) };
  }

  let customer = null;
  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    customer = await Customer.findOne({ _id: customerId, createdByEmail: shopEmail });
  }
  if (!customer) {
    const match = await findTrackCustomerMatches(shopEmail, lead);
    if (match.certain) customer = match.certain;
    else if (match.probable.length > 0 && !createCustomer) {
      return {
        ok: false,
        needsCustomerChoice: true,
        candidates: match.probable.map((row) => ({
          id: String(row._id),
          companyName: String(row.companyName || ""),
          email: String(row.email || ""),
          city: String(row.city || ""),
          state: String(row.state || ""),
        })),
      };
    } else customer = await createTrackCustomer(shopEmail, lead);
  }

  const snapshot = lead.trackMotorSnapshot || {};
  const powerType = resolveMachineType(snapshot.powerType, "AC");
  const sharedSheet = lead.trackDatasheetSnapshot || null;
  const sheetPowerType = resolveMachineType(lead.trackDatasheetPowerType || powerType, powerType);
  const powerConflict = Boolean(sharedSheet) && !machineTypesMatch(sheetPowerType, powerType);
  const prefill = sharedSheet && !powerConflict ? normalizeTrackDatasheet(sharedSheet, powerType) : null;
  const core = prefill ? trackCoreMeasurementsFromDatasheet(prefill, powerType) : {};

  const payload = {
    createdByEmail: shopEmail,
    customerId: String(customer._id),
    companyName: String(customer.companyName || ""),
    customerEmail: String(customer.email || ""),
    customerPhone: String(customer.phone || ""),
    recordType: "RFQ",
    status: "",
    jobStatus: "",
    dateCreated: new Date(),
    date: new Date(),
    namePlate: "Original",
    ...motorFieldsFromSnapshot(snapshot),
    ...core,
    acDatasheet: powerType === "AC" ? prefill : null,
    dcDatasheet: powerType === "DC" ? prefill : null,
    pumpDatasheet: powerType === "Pump" ? prefill : null,
    generatorDatasheet: powerType === "Generator" ? prefill : null,
    internalNotes: proposalNotesFromLead(lead),
    customerNotes: "",
    customerPo: "",
    attachments: (Array.isArray(lead.motorPhotos) ? lead.motorPhotos : [])
      .slice(0, 20)
      .map((url, index) => ({ name: `IQMotorTrack photo ${index + 1}`, url: String(url) })),
    scopeDetails: [],
    otherItems: [],
    sourceSystem: TRACK_SOURCE_SYSTEM,
    externalRef: invitationId,
    importedAt: new Date(),
    /** Linked-record context, read by the Simple proposal form (§9.5 E, §9.6). */
    trackLeadId: String(lead._id),
    trackRfqRequestId: String(lead.trackRfqRequestId || ""),
    trackInvitationId: invitationId,
    trackMotorId: String(lead.trackMotorId || ""),
    trackFacilityId: String(lead.trackFacilityId || ""),
    trackSerialNumber: String(snapshot.serialNumber || ""),
    trackDatasheetPrefilled: Boolean(prefill),
    trackDatasheetProvenance: String(lead.trackDatasheetProvenance || ""),
    trackDatasheetPowerConflict: powerConflict,
    trackDatasheetSharedPowerType: sheetPowerType,
  };

  const mergedSettings = await loadMergedSettingsForEmail(shopEmail);
  let doc;
  try {
    doc = await createSimpleServiceProposalWithUniqueJobNumber(payload, shopEmail, mergedSettings);
  } catch (err) {
    if (err?.code === 11000) {
      const again = await SimpleServiceProposal.findOne({
        createdByEmail: shopEmail,
        sourceSystem: TRACK_SOURCE_SYSTEM,
        externalRef: invitationId,
      }).lean();
      if (again) return { ok: true, existing: true, item: serializeSimplePortalDoc(again) };
    }
    throw err;
  }

  lead.status = "contacted";
  lead.trackProposalId = String(doc._id);
  lead.trackConvertedAt = new Date();
  await lead.save();

  await applyTrackConvertedToProposal(lead, String(doc._id));

  return { ok: true, item: serializeSimplePortalDoc(doc) };
}

/**
 * Read the datasheet the shop currently holds on a linked proposal, ready for
 * write-back. Returns null when the proposal is not linked to IQMotorTrack.
 * @param {Record<string, unknown>} proposal
 */
export function trackLinkedProposalContext(proposal) {
  const src = proposal?.toObject ? proposal.toObject() : proposal || {};
  if (String(src.sourceSystem || "") !== TRACK_SOURCE_SYSTEM) return null;
  const invitationId = String(src.trackInvitationId || src.externalRef || "");
  if (!invitationId) return null;
  return {
    invitationId,
    proposalId: String(src._id || src.id || ""),
    rfqRequestId: String(src.trackRfqRequestId || ""),
    powerType: resolveMachineType(src.motorPower, "AC"),
    jobNumber: String(src.documentNumber || ""),
    recordType: String(src.recordType || "RFQ").toUpperCase(),
    jobStatus: String(src.jobStatus || ""),
    status: String(src.status || ""),
    acDatasheet: src.acDatasheet || null,
    dcDatasheet: src.dcDatasheet || null,
    pumpDatasheet: src.pumpDatasheet || null,
    generatorDatasheet: src.generatorDatasheet || null,
  };
}
