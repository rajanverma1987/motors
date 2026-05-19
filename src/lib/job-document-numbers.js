import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import WorkOrder from "@/models/WorkOrder";
import {
  applyDocumentPrefixIfAbsent,
  effectiveInvoiceNumberPrefix,
  effectiveWorkOrderNumberPrefix,
  workOrderNumberPatternRegex,
  workOrderNumberStem,
} from "@/lib/document-number-prefixes";

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Job / RFQ / quote ID prefix from settings (e.g. CEMR-). Same field as invoice prefix. */
export function effectiveJobNumberPrefix(mergedSettings) {
  const p = effectiveInvoiceNumberPrefix(mergedSettings);
  if (!p) return "";
  return p.endsWith("-") ? p : `${p}-`;
}

/** Parse series counter from stored rfqNumber (A00001 or CEMR-A00001). */
export function parseJobSeriesCounter(rfqNumber) {
  const s = String(rfqNumber ?? "").trim();
  const m = s.match(/A(\d+)$/i);
  return m ? parseInt(m[1], 10) : 0;
}

export function formatJobSeries(counter) {
  const n = Math.max(1, Number(counter) || 1);
  return `A${String(n).padStart(5, "0")}`;
}

/**
 * Next unified job number: {prefix}A00001 (prefix from settings, e.g. CEMR-A00001).
 * @param {import("@/lib/user-settings").mergeUserSettings} mergedSettings
 */
export async function getNextJobNumber(createdByEmail, mergedSettings) {
  const email = createdByEmail.trim().toLowerCase();
  const prefix = effectiveJobNumberPrefix(mergedSettings);
  const list = await Quote.find({ createdByEmail: email }, { rfqNumber: 1 }).lean();
  let maxNum = 0;
  for (const q of list) {
    maxNum = Math.max(maxNum, parseJobSeriesCounter(q.rfqNumber));
  }
  const series = formatJobSeries(maxNum + 1);
  return applyDocumentPrefixIfAbsent(prefix, series);
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
 * @param {import("@/lib/user-settings").mergeUserSettings} mergedSettings
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
