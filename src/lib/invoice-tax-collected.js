import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { computeTotalsFromLaborAndParts, resolveInvoiceTaxFields } from "@/lib/quote-invoice-totals";

/** Status filter key for fully paid invoices with sales tax collected. */
export const INVOICE_FILTER_TAX_COLLECTED = "__tax_collected__";

function round2(v) {
  const n = parseFloat(String(v ?? ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Fully paid invoice with non-zero sales tax (matches Taxes → Tax collected).
 * @param {object} inv
 * @param {object} [customer]
 * @param {object} [mergedSettings]
 */
export function isInvoiceTaxCollected(inv, customer, mergedSettings) {
  const tax = resolveInvoiceTaxFields({ customer });
  const totals = computeTotalsFromLaborAndParts({
    laborTotal: inv?.laborTotal,
    partsTotal: inv?.partsTotal,
    taxExempt: tax.customerTaxExempt,
    taxPercent: tax.customerTaxPercent,
  });
  if (totals.taxAmount <= 0.005) return false;
  const slug = normalizeInvoiceStatusSlug(inv?.status, mergedSettings);
  return slug === "fully_paid";
}

/**
 * @param {object[]} invoices
 * @param {Record<string, object>} custById
 * @param {object} mergedSettings
 */
export function aggregateTaxCollectedSummary(invoices, custById, mergedSettings) {
  let count = 0;
  let invoiceAmount = 0;
  let taxCollected = 0;
  for (const inv of invoices || []) {
    const customer = custById[String(inv?.customerId)] || null;
    if (!isInvoiceTaxCollected(inv, customer, mergedSettings)) continue;
    const tax = resolveInvoiceTaxFields({ customer });
    const totals = computeTotalsFromLaborAndParts({
      laborTotal: inv.laborTotal,
      partsTotal: inv.partsTotal,
      taxExempt: tax.customerTaxExempt,
      taxPercent: tax.customerTaxPercent,
    });
    count += 1;
    invoiceAmount += totals.grandTotal;
    taxCollected += totals.taxAmount;
  }
  return {
    count,
    invoiceAmount: round2(invoiceAmount),
    taxCollected: round2(taxCollected),
  };
}
