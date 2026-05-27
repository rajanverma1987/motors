import { sumPoLineItemsTaxInclusive } from "@/lib/po-line-item-totals";

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
  return Math.round(sumPoLineItemsTaxInclusive(po?.lineItems) * 100) / 100;
}

/** Amount still owed to vendor on recorded vendor invoices. */
export function poBalanceDue(po) {
  const inv = sumVendorInvoiced(po);
  const paid = sumVendorPayments(po);
  return Math.max(0, Math.round((inv - paid) * 100) / 100);
}

/**
 * Outstanding for vendor-facing PO print: unpaid on recorded vendor bills when any exist;
 * otherwise order total minus payments (PO commitment before bills are entered).
 */
export function poBalanceDueVendorFacing(po) {
  const invoiced = sumVendorInvoiced(po);
  const paid = sumVendorPayments(po);
  if (invoiced > 0) {
    return Math.max(0, Math.round((invoiced - paid) * 100) / 100);
  }
  const rawOrder = po?.totalOrder;
  let orderNum =
    rawOrder != null && rawOrder !== "" && Number.isFinite(parseFloat(rawOrder))
      ? parseFloat(rawOrder)
      : poLineOrderTotal(po);
  if (!Number.isFinite(orderNum)) orderNum = 0;
  return Math.max(0, Math.round((orderNum - paid) * 100) / 100);
}

/** Outstanding amount when recording a payment (vendor bills if any, else PO total minus paid). */
export function poAmountDueForPayment(po) {
  return poBalanceDueVendorFacing(po);
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
