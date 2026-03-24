import mongoose from "mongoose";
import InventoryItem from "@/models/InventoryItem";
import InventoryReservation from "@/models/InventoryReservation";
import Quote from "@/models/Quote";

/** @param {string} status */
export function isShippedStatus(status) {
  return /\bshipped\b/i.test(String(status || ""));
}

/**
 * @param {unknown} partsLines
 * @returns {Map<string, number>}
 */
function sumPartsQtyByInventoryItem(partsLines) {
  const byItem = new Map();
  const lines = Array.isArray(partsLines) ? partsLines : [];
  for (const row of lines) {
    const id = String(row?.inventoryItemId ?? "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const q = parseFloat(row?.qty ?? "1");
    if (!Number.isFinite(q) || q <= 0) continue;
    byItem.set(id, (byItem.get(id) || 0) + q);
  }
  return byItem;
}

/**
 * When the first work order is created for a quote, reserve parts linked on the quote.
 * Skips if reservations already exist for this quote (one active set per quote).
 *
 * Uses sequential writes (no multi-document transactions) so it works on standalone MongoDB.
 * Quote lines must include `inventoryItemId` (e.g. from “Add parts” on the quote).
 *
 * @param {string} email
 * @param {string} quoteId
 * @param {string} workOrderId
 */
export async function reserveInventoryForQuoteIfFirstWorkOrder(email, quoteId, workOrderId) {
  const e = email.trim().toLowerCase();
  const qid = String(quoteId || "").trim();
  if (!qid) return { ok: false, error: "quoteId required" };

  const existing = await InventoryReservation.countDocuments({
    createdByEmail: e,
    quoteId: qid,
    status: "active",
  });
  if (existing > 0) return { ok: true, skipped: true };

  const quote = await Quote.findOne({ _id: qid, createdByEmail: e }).lean();
  if (!quote) return { ok: false, error: "Quote not found" };

  const byItem = sumPartsQtyByInventoryItem(quote.partsLines);
  if (byItem.size === 0) return { ok: true, skipped: true, reason: "no_linked_parts" };

  /** Successfully applied steps to roll back on later failure */
  const committed = [];

  try {
    for (const [itemId, qty] of byItem) {
      const oid = new mongoose.Types.ObjectId(itemId);
      const item = await InventoryItem.findOne({ _id: oid, createdByEmail: e }).lean();
      if (!item) {
        throw new Error(`Inventory item not found: ${itemId}`);
      }

      const resDoc = await InventoryReservation.create({
        createdByEmail: e,
        quoteId: qid,
        workOrderId: String(workOrderId || "").trim(),
        inventoryItemId: oid,
        qty,
        status: "active",
      });

      const upd = await InventoryItem.updateOne(
        { _id: oid, createdByEmail: e },
        { $inc: { reserved: qty } }
      );

      if (upd.matchedCount === 0) {
        await InventoryReservation.deleteOne({ _id: resDoc._id });
        throw new Error(`Inventory item update failed: ${itemId}`);
      }

      committed.push({ reservationId: resDoc._id, oid, qty });
    }
    return { ok: true };
  } catch (err) {
    for (const c of committed.slice().reverse()) {
      await InventoryReservation.deleteOne({ _id: c.reservationId }).catch(() => {});
      await InventoryItem.updateOne(
        { _id: c.oid, createdByEmail: e },
        { $inc: { reserved: -c.qty } }
      ).catch(() => {});
    }
    throw err;
  }
}

/**
 * Release active reservations when no work orders remain for the quote.
 *
 * @param {string} email
 * @param {string} quoteId
 */
export async function releaseInventoryReservationsForQuote(email, quoteId) {
  const e = email.trim().toLowerCase();
  const qid = String(quoteId || "").trim();
  if (!qid) return { ok: true };

  const reservations = await InventoryReservation.find({
    createdByEmail: e,
    quoteId: qid,
    status: "active",
  });
  if (reservations.length === 0) return { ok: true };

  for (const r of reservations) {
    await InventoryItem.updateOne(
      { _id: r.inventoryItemId, createdByEmail: e },
      { $inc: { reserved: -r.qty } }
    );
    r.status = "released";
    await r.save();
  }
  return { ok: true };
}

/**
 * When work order moves to Shipped, consume reserved stock for that quote.
 *
 * @param {string} email
 * @param {string} quoteId
 * @param {string} [consumingWorkOrderId] - WO that moved to Shipped (stored for usage history)
 */
export async function consumeInventoryForQuoteOnShipped(email, quoteId, consumingWorkOrderId) {
  const e = email.trim().toLowerCase();
  const qid = String(quoteId || "").trim();
  if (!qid) return { ok: true, skipped: true };

  const woId = String(consumingWorkOrderId || "").trim();

  const reservations = await InventoryReservation.find({
    createdByEmail: e,
    quoteId: qid,
    status: "active",
  });
  if (reservations.length === 0) return { ok: true, skipped: true };

  for (const r of reservations) {
    await InventoryItem.updateOne(
      { _id: r.inventoryItemId, createdByEmail: e },
      { $inc: { onHand: -r.qty, reserved: -r.qty } }
    );
    r.status = "consumed";
    if (woId) r.consumedByWorkOrderId = woId;
    await r.save();
  }
  return { ok: true };
}

/**
 * Increase on-hand when a PO line is newly marked Received (logistics).
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {number} qty
 */
export async function receiveInventoryFromPoLine(email, inventoryItemId, qty) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(qty) || qty <= 0) {
    return { ok: true, skipped: true };
  }
  const r = await InventoryItem.updateOne(
    { _id: id, createdByEmail: e },
    { $inc: { onHand: qty } }
  );
  if (r.matchedCount === 0) return { ok: false, error: "Inventory item not found" };
  return { ok: true };
}
