/**
 * Purchase order line math: extended = qty × unit price;
 * tax = extended × (tax% / 100); line total = extended × (1 + tax% / 100).
 */

export function parsePoLineTaxPercent(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(/%/g, "");
  if (!s) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function poLineExtendedPreTax(row) {
  const q = parseFloat(row?.qty ?? "1");
  const p = parseFloat(row?.unitPrice ?? "0");
  if (!Number.isFinite(q) || !Number.isFinite(p)) return null;
  return q * p;
}

export function poLineTaxAmount(row) {
  const ext = poLineExtendedPreTax(row);
  if (ext == null) return null;
  return ext * (parsePoLineTaxPercent(row?.taxPercent) / 100);
}

export function poLineTotalWithTax(row) {
  const ext = poLineExtendedPreTax(row);
  if (ext == null) return null;
  return ext * (1 + parsePoLineTaxPercent(row?.taxPercent) / 100);
}

/** Sum of tax-inclusive line totals (for PO order total). */
export function sumPoLineItemsTaxInclusive(lines) {
  const arr = Array.isArray(lines) ? lines : [];
  let sum = 0;
  for (const row of arr) {
    const t = poLineTotalWithTax(row);
    if (t != null && Number.isFinite(t)) sum += t;
  }
  return sum;
}

/** Sum of qty × unit price (pre-tax) across lines. */
export function sumPoLineExtendedPreTax(lines) {
  const arr = Array.isArray(lines) ? lines : [];
  let sum = 0;
  for (const row of arr) {
    const ext = poLineExtendedPreTax(row);
    if (ext != null && Number.isFinite(ext)) sum += ext;
  }
  return sum;
}

/** Sum of line tax amounts. */
export function sumPoLineTaxAmount(lines) {
  const arr = Array.isArray(lines) ? lines : [];
  let sum = 0;
  for (const row of arr) {
    const t = poLineTaxAmount(row);
    if (t != null && Number.isFinite(t)) sum += t;
  }
  return sum;
}
