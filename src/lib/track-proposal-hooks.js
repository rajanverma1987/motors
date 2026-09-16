/**
 * Emits E11 to E14 from the shop side when a linked Service Proposal is saved,
 * changes record type, completes, or is invoiced (§9.8, §9.10, §14.6, §14.7).
 *
 * Everything here is best effort and idempotent: a failure must never block the
 * shop from saving its own record, and repeated saves never duplicate history.
 */

import {
  applyTrackDatasheetWriteBack,
  applyTrackInvoiceIssued,
  applyTrackJobCompleted,
  applyTrackJobStatusChanged,
  applyTrackProposalWithdrawn,
} from "@/lib/track-integration";
import { normalizeTrackDatasheet, trackDatasheetFromCoreMeasurements } from "@/lib/track-datasheet";
import { trackLinkedProposalContext } from "@/lib/track-shop-conversion";
import { workOrderClosedStatusesFromMerged } from "@/lib/dropdown-catalog";

/** Statuses that mean "job finished" when the shop has not configured its own. */
const DEFAULT_COMPLETED_STATUSES = ["completed", "shipped", "ready to ship"];

/**
 * Link fields written only by the conversion service. A shop form save must never
 * change them, so no client can attach its own proposal to somebody else's RFQ.
 */
const TRACK_OWNED_KEYS = [
  "sourceSystem",
  "externalRef",
  "trackLeadId",
  "trackRfqRequestId",
  "trackInvitationId",
  "trackMotorId",
  "trackFacilityId",
  "trackSerialNumber",
  "trackDatasheetPrefilled",
  "trackDatasheetProvenance",
  "trackDatasheetPowerConflict",
  "trackDatasheetSharedPowerType",
  "trackProposalSentAt",
  "trackProposalVersion",
];

/**
 * Drop server-owned IQMotorTrack link fields from a client payload.
 * @param {Record<string, unknown>} payload
 */
export function stripTrackOwnedFields(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const out = { ...src };
  for (const key of TRACK_OWNED_KEYS) delete out[key];
  return out;
}

function sheetFor(context, doc) {
  const raw = context.powerType === "DC" ? doc?.dcDatasheet : doc?.acDatasheet;
  return raw && typeof raw === "object" ? raw : null;
}

/** Datasheet plus the four core measurements the shop keeps on the proposal itself. */
function writeBackPayload(context, doc) {
  const base = normalizeTrackDatasheet(sheetFor(context, doc), context.powerType);
  const core = trackDatasheetFromCoreMeasurements(doc, context.powerType);
  // Core measurements only fill blanks; the datasheet itself always wins.
  const merged = JSON.parse(JSON.stringify(base));
  for (const [block, values] of Object.entries(core)) {
    if (!values || typeof values !== "object") continue;
    if (!merged[block] || typeof merged[block] !== "object") merged[block] = {};
    for (const [key, value] of Object.entries(values)) {
      if (!String(value || "").trim()) continue;
      if (String(merged[block][key] ?? "").trim()) continue;
      merged[block][key] = value;
    }
  }
  return merged;
}

function isCompletedStatus(status, mergedSettings) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return false;
  const configured = workOrderClosedStatusesFromMerged(mergedSettings) || [];
  const list = configured.length
    ? configured.map((s) => String(s).toLowerCase())
    : DEFAULT_COMPLETED_STATUSES;
  return list.includes(value);
}

function invoiceNumberOf(doc) {
  return String(doc?.invoiceNumber || doc?.documentNumber || "").trim();
}

/**
 * @param {{
 *   previous: Record<string, unknown>|null,
 *   next: Record<string, unknown>,
 *   shopName: string,
 *   listingId?: string,
 *   mergedSettings?: Record<string, unknown>|null,
 * }} args
 */
export async function emitTrackProposalSideEffects({
  previous,
  next,
  shopName,
  listingId = "",
  mergedSettings = null,
}) {
  const context = trackLinkedProposalContext(next);
  if (!context) return;

  // E11 - datasheet write-back whenever the shop saves datasheet data.
  try {
    const nextSheet = JSON.stringify(writeBackPayload(context, next));
    const prevSheet = previous ? JSON.stringify(writeBackPayload(context, previous)) : "";
    if (nextSheet !== prevSheet) {
      await applyTrackDatasheetWriteBack({
        proposalId: context.proposalId,
        invitationId: context.invitationId,
        rfqRequestId: context.rfqRequestId,
        shopName,
        listingId,
        jobNumber: context.jobNumber,
        powerType: context.powerType,
        datasheet: JSON.parse(nextSheet),
        revision: String(Date.now()),
      });
    }
  } catch (err) {
    console.warn("Track datasheet write-back failed:", err?.message || err);
  }

  const prevRecordType = String(previous?.recordType || "").toUpperCase();
  const prevJobStatus = String(previous?.jobStatus || "");

  // E12 - the proposal became a JOB, or the job status moved on.
  try {
    if (
      (context.recordType === "JOB" && prevRecordType !== "JOB") ||
      (context.recordType === "JOB" && context.jobStatus !== prevJobStatus)
    ) {
      await applyTrackJobStatusChanged({
        proposalId: context.proposalId,
        jobStatus: context.jobStatus,
        recordType: context.recordType,
        jobNumber: context.jobNumber,
      });
    }
  } catch (err) {
    console.warn("Track job status emit failed:", err?.message || err);
  }

  // E13 - job completed.
  try {
    const nowComplete = isCompletedStatus(context.jobStatus, mergedSettings);
    const wasComplete = isCompletedStatus(prevJobStatus, mergedSettings);
    if (nowComplete && !wasComplete) {
      await applyTrackJobCompleted({
        proposalId: context.proposalId,
        jobNumber: context.jobNumber,
        description: String(next?.customerNotes || next?.internalNotes || ""),
        failureCause: String(next?.failureCause || ""),
        workType: String(next?.quoteType || "other"),
      });
    }
  } catch (err) {
    console.warn("Track job completion emit failed:", err?.message || err);
  }

  // E14 - invoice issued.
  try {
    const becameInvoice = context.recordType === "INVOICE" && prevRecordType !== "INVOICE";
    const invoiceDateChanged =
      context.recordType === "INVOICE" &&
      String(next?.invoiceSubmitDate || "") !== String(previous?.invoiceSubmitDate || "");
    if (becameInvoice || invoiceDateChanged) {
      await applyTrackInvoiceIssued({
        proposalId: context.proposalId,
        invoiceNumber: invoiceNumberOf(next),
        invoiceTotal: next?.total,
        currency: "USD",
        invoicedAt: next?.invoiceSubmitDate || new Date(),
      });
    }
  } catch (err) {
    console.warn("Track invoice emit failed:", err?.message || err);
  }
}

/** The shop deleted a linked proposal, so the plant shows that shop as Withdrawn (§10). */
export async function emitTrackProposalDeleted(deleted) {
  const context = trackLinkedProposalContext(deleted);
  if (!context) return;
  try {
    await applyTrackProposalWithdrawn(context.proposalId);
  } catch (err) {
    console.warn("Track proposal withdrawn emit failed:", err?.message || err);
  }
}
