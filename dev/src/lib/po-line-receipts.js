import mongoose from "mongoose";
import PurchaseOrder from "@/models/PurchaseOrder";
import LogisticsEntry from "@/models/LogisticsEntry";
import { receiveInventoryFromPoLine, reverseReceiveInventoryFromPoLine } from "@/lib/inventory-service";

/** @param {unknown} raw */
export function normalizePoLineReceiptStatuses(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const v = String(s ?? "").trim();
    return v === "Received" || v === "Back Order" ? v : "";
  });
}

/**
 * Apply shop receiving statuses to each PO line (Received | Back Order).
 * When every line is Received, GET deliveryStatus will be "Delivered".
 * Newly Received lines with inventoryItemId increase on-hand (once per transition).
 *
 * @returns {Promise<{ ok: boolean, error?: string, appliedStatuses?: string[] }>}
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
    return { ok: true, appliedStatuses: [] };
  }
  if (!Array.isArray(statuses) || statuses.length !== lines.length) {
    return {
      ok: false,
      error: "Mark each PO line as Received or Back Order",
    };
  }
  const previousStatuses = lines.map((li) => String(li?.status ?? "").trim());
  const appliedStatuses = [];
  for (let i = 0; i < lines.length; i++) {
    const s = String(statuses[i] ?? "").trim();
    if (s !== "Received" && s !== "Back Order") {
      return { ok: false, error: "Each line must be Received or Back Order" };
    }
    po.lineItems[i].status = s;
    appliedStatuses.push(s);
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

  return { ok: true, appliedStatuses };
}

/**
 * Revert PO line statuses (and inventory) applied by a vendor PO receiving logistics entry.
 *
 * @param {string} purchaseOrderId
 * @param {string} ownerEmail
 * @param {string[]} statusesSnapshot — what this logistics entry recorded when saved
 * @param {{ legacySoleReceipt?: boolean }} [options] — no snapshot: revert all Received/Back Order lines if only receipt
 */
export async function revertPoLineReceiptFromLogistics(
  purchaseOrderId,
  ownerEmail,
  statusesSnapshot,
  options = {}
) {
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

  const snapshot = normalizePoLineReceiptStatuses(statusesSnapshot);
  const useLegacy = snapshot.length !== lines.length && options.legacySoleReceipt;

  for (let i = 0; i < lines.length; i++) {
    const current = String(po.lineItems[i]?.status ?? "").trim();
    let shouldRevert = false;
    let wasReceivedInEntry = false;

    if (useLegacy) {
      shouldRevert = current === "Received" || current === "Back Order";
      wasReceivedInEntry = current === "Received";
    } else if (snapshot[i]) {
      const applied = snapshot[i];
      shouldRevert = current === applied;
      wasReceivedInEntry = applied === "Received";
    }

    if (!shouldRevert) continue;

    po.lineItems[i].status = "Ordered";

    if (wasReceivedInEntry) {
      const invId = String(po.lineItems[i]?.inventoryItemId ?? "").trim();
      if (invId && mongoose.Types.ObjectId.isValid(invId)) {
        const qty = parseFloat(po.lineItems[i]?.qty ?? "1");
        if (Number.isFinite(qty) && qty > 0) {
          const rev = await reverseReceiveInventoryFromPoLine(email, invId, qty);
          if (!rev.ok) {
            console.error("Inventory reverse from PO line:", rev.error, { purchaseOrderId, lineIndex: i });
          }
        }
      }
    }
  }

  po.markModified("lineItems");
  await po.save();
  return { ok: true };
}

/**
 * When deleting vendor_po_receiving logistics, revert linked PO lines if appropriate.
 *
 * @param {import("mongoose").Document} logisticsEntry — lean or doc before delete
 * @param {string} ownerEmail
 * @param {string} [excludeLogisticsId] — entry being deleted (exclude from "other receipts" count)
 */
export async function revertPoOnLogisticsDelete(logisticsEntry, ownerEmail, excludeLogisticsId) {
  const email = ownerEmail.trim().toLowerCase();
  if (logisticsEntry?.kind !== "vendor_po_receiving" || !logisticsEntry?.purchaseOrderId) {
    return { ok: true };
  }
  const poId = String(logisticsEntry.purchaseOrderId);
  const snapshot = logisticsEntry.poLineReceiptStatuses || [];

  const otherCount = await LogisticsEntry.countDocuments({
    createdByEmail: email,
    kind: "vendor_po_receiving",
    purchaseOrderId: logisticsEntry.purchaseOrderId,
    _id: { $ne: excludeLogisticsId },
  });

  const legacySoleReceipt = snapshot.length === 0 && otherCount === 0;
  const hasSnapshot = snapshot.length > 0;

  if (!hasSnapshot && otherCount > 0) {
    return { ok: true, skipped: true };
  }

  return revertPoLineReceiptFromLogistics(poId, email, snapshot, { legacySoleReceipt });
}
