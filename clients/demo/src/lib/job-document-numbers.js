import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import WorkOrder from "@/models/WorkOrder";
import {
  effectiveWorkOrderNumberPrefix,
  workOrderNumberPatternRegex,
  workOrderNumberStem,
} from "@/lib/document-number-prefixes";
import { computeNextJobNumber } from "@/lib/job-document-number-format";

export {
  computeNextJobNumber,
  effectiveJobNumberPrefix,
  formatJobSeries,
  parseJobSeriesCounter,
} from "@/lib/job-document-number-format";

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Next unified job number: {prefix}A00001 (prefix from settings, e.g. CEMR-A00001).
 * @param {string} createdByEmail
 * @param {ReturnType<typeof import("@/lib/user-settings").mergeUserSettings>} mergedSettings
 */
export async function getNextJobNumber(createdByEmail, mergedSettings) {
  const email = createdByEmail.trim().toLowerCase();
  const list = await Quote.find({ createdByEmail: email }, { rfqNumber: 1 }).lean();
  return computeNextJobNumber(
    list.map((q) => q.rfqNumber),
    mergedSettings
  );
}

/**
 * Invoice numbers: CEMR-A00001-1, CEMR-A00001-2, …
 * @param {string} email
 * @param {string} quoteId
 * @param {string} baseJobNumber — quote.rfqNumber
 */
export async function nextInvoiceNumberForQuote(email, quoteId, baseJobNumber) {
  const base = String(baseJobNumber ?? "").trim();
  if (!base) return "";
  const owner = email.trim().toLowerCase();
  const rx = new RegExp(`^${escapeRegExp(base)}-(\\d+)$`);
  const existing = await Invoice.find({
    createdByEmail: owner,
    quoteId: String(quoteId || "").trim(),
  })
    .select("invoiceNumber")
    .lean();
  let maxSuffix = 0;
  for (const inv of existing) {
    const m = String(inv.invoiceNumber || "").match(rx);
    if (m) maxSuffix = Math.max(maxSuffix, parseInt(m[1], 10));
  }
  return `${base}-${maxSuffix + 1}`;
}

/**
 * Work order numbers: W-CEMR-A00001-1, W-CEMR-A00001-2, …
 * @param {ReturnType<typeof import("@/lib/user-settings").mergeUserSettings>} mergedSettings
 */
export async function nextWorkOrderNumberForJob(email, baseJobNumber, mergedSettings) {
  const woHead = effectiveWorkOrderNumberPrefix(mergedSettings);
  const segment = String(baseJobNumber ?? "")
    .trim()
    .replace(/[^\w-]/g, "") || "RFQ";
  const stem = workOrderNumberStem(woHead, segment);
  const rx = workOrderNumberPatternRegex(stem);
  const latest = await WorkOrder.findOne({
    createdByEmail: email.trim().toLowerCase(),
    workOrderNumber: rx,
  })
    .sort({ createdAt: -1, workOrderNumber: -1 })
    .lean();
  let next = 1;
  if (latest?.workOrderNumber) {
    const parts = String(latest.workOrderNumber).split("-");
    const parsed = Number.parseInt(parts[parts.length - 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) next = parsed + 1;
  }
  return `${stem}-${next}`;
}
