import { invoiceStatusAllowedSlugs } from "@/lib/dropdown-catalog";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";

/** RFQ intake status — not shown as a “quote” until promoted to a quote_status dropdown value. */
export const WRITE_UP_QUOTE_STATUS = "write-up";

/** Fixed status after pre-inspection is complete (not from Settings dropdowns). */
export const INSPECTION_DONE_QUOTE_STATUS = "inspection-done";

/** Quote status when reverting an invoice back to the RFQ list (Settings → Dropdowns → Quote status). */
export const CONVERT_TO_RFQ_QUOTE_STATUS = "proposal_approved_regular";

export function isInspectionDoneStatus(status) {
  return (
    String(status ?? "")
      .trim()
      .toLowerCase() === INSPECTION_DONE_QUOTE_STATUS
  );
}

/** Normalize status for comparisons (handles "Write Up", "write_up", etc.). */
export function normalizeQuoteStatusKey(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

export function isWriteUpStatus(status) {
  const key = normalizeQuoteStatusKey(status);
  return key === WRITE_UP_QUOTE_STATUS || key === "writeup";
}

/** RFQ# until a work order exists for the job; then JOB#. */
export function jobNumberFieldLabel(workOrderId) {
  return String(workOrderId ?? "").trim() ? "JOB#" : "RFQ#";
}

/**
 * @param {string} status
 * @param {string[]} quoteStatusSlugs — values from Settings → Dropdowns → Quote status
 */
export function isQuotePhaseStatus(status, quoteStatusSlugs = []) {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!s || isWriteUpStatus(s)) return false;
  const allowed = new Set(
    (Array.isArray(quoteStatusSlugs) ? quoteStatusSlugs : [])
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  if (!allowed.size) return !isWriteUpStatus(s);
  return allowed.has(s);
}

/** Quote ids that have at least one invoice whose status is in Settings → Invoice status. */
export function quoteIdsWithInvoicesInDropdown(invoices, mergedSettings) {
  const allowed = new Set(invoiceStatusAllowedSlugs(mergedSettings));
  const ids = new Set();
  for (const inv of invoices || []) {
    const qid = String(inv?.quoteId || "").trim();
    if (!qid) continue;
    const slug = normalizeInvoiceStatusSlug(inv.status, mergedSettings);
    if (allowed.has(slug)) ids.add(qid);
  }
  return ids;
}

/** RFQ list: hide jobs that already have an invoice (see Invoices page). */
export function filterQuotesForRfqList(allQuotes, invoices, mergedSettings) {
  const invoicedIds = quoteIdsWithInvoicesInDropdown(invoices, mergedSettings);
  return (allQuotes || []).filter((q) => !invoicedIds.has(String(q?.id || "").trim()));
}
