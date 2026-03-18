import PurchaseOrder from "@/models/PurchaseOrder";

/**
 * Apply shop receiving statuses to each PO line (Received | Back Order).
 * When every line is Received, GET deliveryStatus will be "Delivered".
 */
export async function applyPoLineReceiptStatuses(purchaseOrderId, ownerEmail, statuses) {
  const email = ownerEmail.trim().toLowerCase();
  const po = await PurchaseOrder.findOne({
    _id: purchaseOrderId,
    createdByEmail: email,
  });
  if (!po) {
    return { ok: false, error: "Purchase order not found" };
  }
  const lines = Array.isArray(po.lineItems) ? po.lineItems : [];
  if (lines.length === 0) {
    return { ok: true };
  }
  if (!Array.isArray(statuses) || statuses.length !== lines.length) {
    return {
      ok: false,
      error: "Mark each PO line as Received or Back Order",
    };
  }
  for (let i = 0; i < lines.length; i++) {
    const s = String(statuses[i] ?? "").trim();
    if (s !== "Received" && s !== "Back Order") {
      return { ok: false, error: "Each line must be Received or Back Order" };
    }
    po.lineItems[i].status = s;
  }
  po.markModified("lineItems");
  await po.save();
  return { ok: true };
}
