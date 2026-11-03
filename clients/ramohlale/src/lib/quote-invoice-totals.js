function toNumber(value) {
  const num = parseFloat(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
}

function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeTaxExempt(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "true" || text === "yes" || text === "1") return true;
  if (text === "false" || text === "no" || text === "0") return false;
  return true;
}

export function normalizeTaxPercent(value) {
  const num = toNumber(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(100, roundMoney(num));
}

/** Print label: percent after Tax, for example "Tax (7%)". */
export function formatTaxLineLabel(taxPercent, taxExempt) {
  if (normalizeTaxExempt(taxExempt)) return "Tax";
  const pct = normalizeTaxPercent(taxPercent);
  if (pct <= 0) return "Tax";
  const text = Number.isInteger(pct) ? String(pct) : String(pct);
  return `Tax (${text}%)`;
}

export function computeTaxAmount(subtotal, taxExempt, taxPercent) {
  const base = roundMoney(subtotal);
  if (normalizeTaxExempt(taxExempt)) return 0;
  const pct = normalizeTaxPercent(taxPercent);
  if (pct <= 0) return 0;
  return roundMoney((base * pct) / 100);
}

export function computeGrandTotal(subtotal, taxExempt, taxPercent) {
  const base = roundMoney(subtotal);
  const tax = computeTaxAmount(base, taxExempt, taxPercent);
  return roundMoney(base + tax);
}

/**
 * Subtotal, then discount, then tax on the discounted taxable share.
 * Non-taxable amounts keep their share of the subtotal, so a discount does not tax them.
 */
export function totalsAfterDiscount({
  subtotal,
  taxableBase,
  discount = 0,
  taxExempt,
  taxPercent,
}) {
  const base = roundMoney(Math.max(0, toNumber(subtotal)));
  const taxable = Math.min(base, Math.max(0, roundMoney(toNumber(taxableBase))));
  const discountAmount = Math.min(base, Math.max(0, roundMoney(toNumber(discount))));
  const total = roundMoney(base - discountAmount);
  const taxableAfter = base > 0 ? roundMoney((taxable * total) / base) : 0;
  const taxAmount = computeTaxAmount(taxableAfter, taxExempt, taxPercent);
  return {
    subtotal: base,
    discountAmount,
    total,
    taxAmount,
    grandTotal: roundMoney(total + taxAmount),
  };
}

/** laborTotal = scope sum; partsTotal = other cost. Tax applies after discount. */
export function computeTotalsFromLaborAndParts({
  laborTotal,
  partsTotal,
  taxablePartsTotal = 0,
  taxExempt,
  taxPercent,
  discount = 0,
}) {
  const labor = roundMoney(toNumber(laborTotal));
  const parts = roundMoney(toNumber(partsTotal));
  const taxableParts = roundMoney(toNumber(taxablePartsTotal));
  return totalsAfterDiscount({
    subtotal: labor + parts,
    taxableBase: labor + taxableParts,
    discount,
    taxExempt,
    taxPercent,
  });
}

/** Invoices use the linked customer’s tax settings when a customer record exists. */
export function resolveInvoiceTaxFields({ customer, quote } = {}) {
  if (customer && typeof customer === "object") {
    return {
      customerTaxExempt: normalizeTaxExempt(customer.taxExempt),
      customerTaxPercent: String(normalizeTaxPercent(customer.taxPercent)),
    };
  }
  return {
    customerTaxExempt: normalizeTaxExempt(quote?.customerTaxExempt),
    customerTaxPercent: String(normalizeTaxPercent(quote?.customerTaxPercent)),
  };
}
