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

export function computeTotalsFromLaborAndParts({
  laborTotal,
  partsTotal,
  taxExempt,
  taxPercent,
}) {
  const subtotal = roundMoney(toNumber(laborTotal) + toNumber(partsTotal));
  const taxAmount = computeTaxAmount(subtotal, taxExempt, taxPercent);
  return {
    subtotal,
    taxAmount,
    grandTotal: roundMoney(subtotal + taxAmount),
  };
}
