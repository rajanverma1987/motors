/** Sum vendor invoice amounts on a PO (lean or API shape). */
export function sumVendorInvoiced(po) {
  const inv = Array.isArray(po?.vendorInvoices) ? po.vendorInvoices : [];
  let s = 0;
  for (const row of inv) {
    const a = parseFloat(row?.amount ?? "0");
    if (Number.isFinite(a)) s += a;
  }
  return Math.round(s * 100) / 100;
}

export function sumVendorPayments(po) {
  const pays = Array.isArray(po?.payments) ? po.payments : [];
  let s = 0;
  for (const row of pays) {
    const a = parseFloat(row?.amount ?? "0");
    if (Number.isFinite(a)) s += a;
  }
  return Math.round(s * 100) / 100;
}

export function poLineOrderTotal(po) {
  const lines = Array.isArray(po?.lineItems) ? po.lineItems : [];
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.unitPrice ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return Math.round(sum * 100) / 100;
}

/** Amount still owed to vendor on recorded vendor invoices. */
export function poBalanceDue(po) {
  const inv = sumVendorInvoiced(po);
  const paid = sumVendorPayments(po);
  return Math.max(0, Math.round((inv - paid) * 100) / 100);
}

/** Latest vendor invoice date (YYYY-MM-DD) for aging; null if none. */
export function latestVendorInvoiceDate(po) {
  const inv = Array.isArray(po?.vendorInvoices) ? po.vendorInvoices : [];
  let best = null;
  for (const row of inv) {
    const d = String(row?.date ?? "").trim().slice(0, 10);
    if (!d) continue;
    if (!best || d > best) best = d;
  }
  return best;
}

export function daysSinceApAnchor(dateStr, createdAt) {
  const s = String(dateStr ?? "").trim().slice(0, 10);
  let t;
  if (s && s.length >= 8) {
    t = new Date(`${s}T12:00:00`).getTime();
  } else if (createdAt) {
    t = new Date(createdAt).getTime();
  } else return null;
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export function apAgingBucket(days) {
  if (days == null || days < 0) return "unknown";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function computePoStatus(totalOrder, totalInvoiced, totalPaid) {
  if (totalOrder <= 0) return "Open";
  if (totalPaid >= totalInvoiced && totalInvoiced >= totalOrder) return "Closed";
  if (totalPaid > 0 && totalPaid < totalInvoiced) return "Partially Paid";
  if (totalInvoiced >= totalOrder) return "Fully Invoiced";
  if (totalInvoiced > 0) return "Partially Invoiced";
  return "Open";
}
