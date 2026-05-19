import { invoiceStatusAllowedSlugs } from "@/lib/dropdown-catalog";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";

/** RFQ intake status — not shown as a “quote” until promoted to a quote_status dropdown value. */
export const WRITE_UP_QUOTE_STATUS = "write-up";

export function isWriteUpStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase() === WRITE_UP_QUOTE_STATUS;
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
