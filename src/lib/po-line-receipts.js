import mongoose from "mongoose";
import PurchaseOrder from "@/models/PurchaseOrder";
import { receiveInventoryFromPoLine } from "@/lib/inventory-service";

/**
 * Apply shop receiving statuses to each PO line (Received | Back Order).
 * When every line is Received, GET deliveryStatus will be "Delivered".
 * Newly Received lines with inventoryItemId increase on-hand (once per transition).
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
  const previousStatuses = lines.map((li) => String(li?.status ?? "").trim());
  for (let i = 0; i < lines.length; i++) {
    const s = String(statuses[i] ?? "").trim();
    if (s !== "Received" && s !== "Back Order") {
      return { ok: false, error: "Each line must be Received or Back Order" };
    }
    po.lineItems[i].status = s;
  }
  po.markModified("lineItems");
  await po.save();

  for (let i = 0; i < lines.length; i++) {
    const wasReceived = previousStatuses[i] === "Received";
    const nowReceived = po.lineItems[i]?.status === "Received";
    if (wasReceived || !nowReceived) continue;
    const invId = String(po.lineItems[i]?.inventoryItemId ?? "").trim();
    if (!invId || !mongoose.Types.ObjectId.isValid(invId)) continue;
    const qty = parseFloat(po.lineItems[i]?.qty ?? "1");
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const recv = await receiveInventoryFromPoLine(email, invId, qty);
    if (!recv.ok) {
      console.error("Inventory receive from PO line:", recv.error, { purchaseOrderId, lineIndex: i });
    }
  }

  return { ok: true };
}
