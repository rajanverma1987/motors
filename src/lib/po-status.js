/**
 * Purchase order aggregate status labels for list/detail APIs.
 */

/** @param {Array<{ status?: string }>} lineItems */
export function computePoDeliveryStatus(lineItems) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  if (items.length === 0) return "—";

  const normalized = items.map((item) => {
    const s = item?.status;
    if (s === "Received") return "Received";
    if (s === "Back Order") return "Back Order";
    if (s === "Delivered" || s === "Dispatch") return "Dispatch";
    return "Ordered";
  });

  if (normalized.every((s) => s === "Received")) return "Delivered";

  const hasReceiptProgress = normalized.some(
    (s) => s === "Received" || s === "Dispatch" || s === "Back Order"
  );
  if (!hasReceiptProgress) return "—";

  return "Partial";
}

export function computePoInvoicedStatus(totalOrder, totalInvoiced) {
  const order = Number(totalOrder) || 0;
  const invoiced = Number(totalInvoiced) || 0;
  if (order <= 0) return "—";
  if (invoiced <= 0) return "—";
  if (invoiced >= order) return "Invoiced";
  return "Partial";
}

/**
 * Paid column: against vendor invoices when any exist; otherwise against PO order total.
 */
export function computePoPaidStatus(totalInvoiced, totalPaid, totalOrder = 0) {
  const invoiced = Number(totalInvoiced) || 0;
  const paid = Number(totalPaid) || 0;
  const order = Number(totalOrder) || 0;

  if (paid <= 0) return "—";

  const basis = invoiced > 0 ? invoiced : order;
  if (basis <= 0) return "—";

  if (paid >= basis) return "Paid";
  return "Partially";
}

export function computePoOverallStatus(totalOrder, totalInvoiced, totalPaid) {
  const order = Number(totalOrder) || 0;
  const invoiced = Number(totalInvoiced) || 0;
  const paid = Number(totalPaid) || 0;
  if (order <= 0) return "Open";
  if (paid >= invoiced && invoiced >= order) return "Closed";
  if (paid > 0 && paid < invoiced) return "Partially Paid";
  if (invoiced >= order) return "Fully Invoiced";
  if (invoiced > 0) return "Partially Invoiced";
  return "Open";
}
