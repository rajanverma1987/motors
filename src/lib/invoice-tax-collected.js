import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { invoiceStatusSelectOptionsFromMerged } from "@/lib/dropdown-catalog";
import { computeTotalsFromLaborAndParts, resolveInvoiceTaxFields } from "@/lib/quote-invoice-totals";

/** Status filter key for fully paid invoices with sales tax collected. */
export const INVOICE_FILTER_TAX_COLLECTED = "__tax_collected__";

/** Status filter key for billed invoices with sales tax still to be collected. */
export const INVOICE_FILTER_TAX_TO_BE_COLLECTED = "__tax_to_be_collected__";

/** Invoice status slug for billed / sent-to-customer (Settings → Dropdowns → Invoice status). */
export const INVOICE_BILLED_STATUS_SLUG = "billed";

function invoiceStatusKey(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Billed status slug from Settings → Dropdowns (label or value "Billed").
 * @param {object} [mergedSettings]
 */
export function resolveInvoiceBilledStatusSlug(mergedSettings) {
  const entries = mergedSettings?.controlledDropdowns?.invoice_status?.entries;
  if (Array.isArray(entries)) {
    for (const e of entries) {
      const value = invoiceStatusKey(e?.value);
      const label = String(e?.label ?? "")
        .trim()
        .toLowerCase();
      if (value === INVOICE_BILLED_STATUS_SLUG || label === INVOICE_BILLED_STATUS_SLUG) {
        return value || INVOICE_BILLED_STATUS_SLUG;
      }
    }
  }
  const opts = invoiceStatusSelectOptionsFromMerged(mergedSettings);
  const match = opts.find(
    (o) =>
      invoiceStatusKey(o.value) === INVOICE_BILLED_STATUS_SLUG ||
      String(o.label || "")
        .trim()
        .toLowerCase() === INVOICE_BILLED_STATUS_SLUG
  );
  return match?.value || INVOICE_BILLED_STATUS_SLUG;
}

function invoiceTaxTotals(inv, customer) {
  const tax = resolveInvoiceTaxFields({ customer, quote: inv });
  return computeTotalsFromLaborAndParts({
    laborTotal: inv?.laborTotal,
    partsTotal: inv?.partsTotal,
    taxExempt: tax.customerTaxExempt,
    taxPercent: tax.customerTaxPercent,
  });
}

/** @param {object} inv @param {object} [mergedSettings] */
export function isInvoiceBilledStatus(inv, mergedSettings) {
  const billedSlug = resolveInvoiceBilledStatusSlug(mergedSettings);
  const invKey = invoiceStatusKey(inv?.status);
  if (invKey === invoiceStatusKey(billedSlug)) return true;
  return normalizeInvoiceStatusSlug(inv?.status, mergedSettings) === billedSlug;
}

function round2(v) {
  const n = parseFloat(String(v ?? ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Fully paid invoice with non-zero sales tax (Invoices → Tax collected filter).
 * @param {object} inv
 * @param {object} [customer]
 * @param {object} [mergedSettings]
 */
export function isInvoiceTaxCollected(inv, customer, mergedSettings) {
  const totals = invoiceTaxTotals(inv, customer);
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
    const totals = invoiceTaxTotals(inv, customer);
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

/**
 * Billed invoice for tax-to-be-collected summary and filter.
 * @param {object} inv
 * @param {object} [mergedSettings]
 */
export function isInvoiceTaxToBeCollected(inv, _customer, mergedSettings) {
  return isInvoiceBilledStatus(inv, mergedSettings);
}

/**
 * @param {object[]} invoices
 * @param {Record<string, object>} custById
 * @param {object} mergedSettings
 */
export function aggregateTaxToBeCollectedSummary(invoices, custById, mergedSettings) {
  let count = 0;
  let invoiceAmount = 0;
  let taxToBeCollected = 0;
  for (const inv of invoices || []) {
    const customer = custById[String(inv?.customerId)] || null;
    if (!isInvoiceTaxToBeCollected(inv, customer, mergedSettings)) continue;
    const totals = invoiceTaxTotals(inv, customer);
    count += 1;
    invoiceAmount += totals.grandTotal;
    taxToBeCollected += totals.taxAmount;
  }
  return {
    count,
    invoiceAmount: round2(invoiceAmount),
    taxToBeCollected: round2(taxToBeCollected),
  };
}
