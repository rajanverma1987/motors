/** Numeric invoice total from labor + parts (same as UI). */
export function invoiceLineTotal(inv) {
  const l = parseFloat(inv?.laborTotal ?? "0");
  const p = parseFloat(inv?.partsTotal ?? "0");
  const a = (Number.isFinite(l) ? l : 0) + (Number.isFinite(p) ? p : 0);
  return Math.round(a * 100) / 100;
}

/** Sum of recorded payment amounts. */
export function invoiceTotalPaid(inv) {
  const list = Array.isArray(inv?.payments) ? inv.payments : [];
  let s = 0;
  for (const pay of list) {
    const x = parseFloat(pay?.amount ?? "0");
    if (Number.isFinite(x) && x > 0) s += x;
  }
  return Math.round(s * 100) / 100;
}

export function invoiceBalance(inv) {
  const t = invoiceLineTotal(inv);
  const p = invoiceTotalPaid(inv);
  return Math.max(0, Math.round((t - p) * 100) / 100);
}

/** Days since invoice date string (YYYY-MM-DD); null if unparseable. */
export function daysOutstanding(invoiceDateStr) {
  const s = String(invoiceDateStr ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function agingBucket(days) {
  if (days == null || days < 0) return "unknown";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}
