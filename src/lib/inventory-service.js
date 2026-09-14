import mongoose from "mongoose";
import InventoryItem from "@/models/InventoryItem";
import InventoryReservation from "@/models/InventoryReservation";
import InventoryMovement from "@/models/InventoryMovement";
import Quote from "@/models/Quote";

/** @param {string} status */
export function isShippedStatus(status) {
  return /\bshipped\b/i.test(String(status || ""));
}

/**
 * @param {object} fields
 */
export async function recordInventoryMovement(fields) {
  const email = String(fields.createdByEmail || "").trim().toLowerCase();
  const itemId = String(fields.inventoryItemId || "").trim();
  if (!email || !mongoose.Types.ObjectId.isValid(itemId)) {
    return null;
  }
  const qty = Number(fields.qty);
  if (!Number.isFinite(qty) || qty === 0) return null;

  let balanceAfter = fields.balanceAfter;
  if (balanceAfter == null) {
    const item = await InventoryItem.findOne({ _id: itemId, createdByEmail: email })
      .select("onHand")
      .lean();
    if (item) balanceAfter = Number(item.onHand) || 0;
  }

  return InventoryMovement.create({
    createdByEmail: email,
    inventoryItemId: itemId,
    qty,
    type: fields.type,
    purchaseOrderId: String(fields.purchaseOrderId || "").trim(),
    poLineId: String(fields.poLineId || "").trim(),
    poNumber: String(fields.poNumber || "").trim(),
    vendorName: String(fields.vendorName || "").trim(),
    simpleServiceProposalId: String(fields.simpleServiceProposalId || "").trim(),
    documentNumber: String(fields.documentNumber || "").trim(),
    quoteId: String(fields.quoteId || "").trim(),
    workOrderId: String(fields.workOrderId || "").trim(),
    reservationId: String(fields.reservationId || "").trim(),
    relatedMovementId: String(fields.relatedMovementId || "").trim(),
    reason: String(fields.reason || "").trim(),
    notes: String(fields.notes || "").trim(),
    balanceAfter: balanceAfter == null ? null : Number(balanceAfter),
  });
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

      await recordInventoryMovement({
        createdByEmail: e,
        inventoryItemId: oid,
        qty,
        type: "reserve",
        quoteId: qid,
        workOrderId: String(workOrderId || "").trim(),
        reservationId: String(resDoc._id),
        balanceAfter: Number(item.onHand) || 0,
      });

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
    const item = await InventoryItem.findOneAndUpdate(
      { _id: r.inventoryItemId, createdByEmail: e },
      { $inc: { reserved: -r.qty } },
      { new: true }
    ).lean();
    r.status = "released";
    await r.save();
    await recordInventoryMovement({
      createdByEmail: e,
      inventoryItemId: r.inventoryItemId,
      qty: r.qty,
      type: "release",
      quoteId: qid,
      workOrderId: String(r.workOrderId || "").trim(),
      reservationId: String(r._id),
      balanceAfter: item ? Number(item.onHand) || 0 : null,
    });
  }
  return { ok: true };
}

/**
 * When work order moves to Shipped, consume reserved stock for that quote.
 *
 * @param {string} email
 * @param {string} quoteId
 * @param {string} [consumingWorkOrderId]
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
    const item = await InventoryItem.findOneAndUpdate(
      { _id: r.inventoryItemId, createdByEmail: e },
      { $inc: { onHand: -r.qty, reserved: -r.qty } },
      { new: true }
    ).lean();
    r.status = "consumed";
    if (woId) r.consumedByWorkOrderId = woId;
    await r.save();
    await recordInventoryMovement({
      createdByEmail: e,
      inventoryItemId: r.inventoryItemId,
      qty: -r.qty,
      type: "consume",
      quoteId: qid,
      workOrderId: woId || String(r.workOrderId || "").trim(),
      reservationId: String(r._id),
      balanceAfter: item ? Number(item.onHand) || 0 : null,
    });
  }
  return { ok: true };
}

/**
 * @param {unknown} otherItems
 * @returns {Map<string, number>}
 */
export function sumOtherItemsQtyByInventoryItem(otherItems) {
  return sumPartsQtyByInventoryItem(otherItems);
}

/**
 * Reserve inventory for a Simple JOB from Other Items with inventoryItemId.
 *
 * @param {string} email
 * @param {string} proposalId
 * @param {unknown} otherItems
 * @param {{ force?: boolean }} [options]
 */
export async function reserveInventoryForSimpleJob(email, proposalId, otherItems, options = {}) {
  const e = email.trim().toLowerCase();
  const sid = String(proposalId || "").trim();
  if (!sid) return { ok: false, error: "simpleServiceProposalId required" };

  if (!options.force) {
    const existing = await InventoryReservation.countDocuments({
      createdByEmail: e,
      simpleServiceProposalId: sid,
      status: "active",
    });
    if (existing > 0) return { ok: true, skipped: true };
  }

  const byItem = sumOtherItemsQtyByInventoryItem(otherItems);
  if (byItem.size === 0) return { ok: true, skipped: true, reason: "no_linked_parts" };

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
        simpleServiceProposalId: sid,
        workOrderId: "",
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

      await recordInventoryMovement({
        createdByEmail: e,
        inventoryItemId: oid,
        qty,
        type: "reserve",
        simpleServiceProposalId: sid,
        reservationId: String(resDoc._id),
        balanceAfter: Number(item.onHand) || 0,
      });

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
 * Release active Simple reservations (e.g. JOB → RFQ or delete).
 *
 * @param {string} email
 * @param {string} proposalId
 */
export async function releaseInventoryReservationsForSimple(email, proposalId) {
  const e = email.trim().toLowerCase();
  const sid = String(proposalId || "").trim();
  if (!sid) return { ok: true };

  const reservations = await InventoryReservation.find({
    createdByEmail: e,
    simpleServiceProposalId: sid,
    status: "active",
  });
  if (reservations.length === 0) return { ok: true };

  for (const r of reservations) {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: r.inventoryItemId, createdByEmail: e },
      { $inc: { reserved: -r.qty } },
      { new: true }
    ).lean();
    r.status = "released";
    await r.save();
    await recordInventoryMovement({
      createdByEmail: e,
      inventoryItemId: r.inventoryItemId,
      qty: r.qty,
      type: "release",
      simpleServiceProposalId: sid,
      reservationId: String(r._id),
      balanceAfter: item ? Number(item.onHand) || 0 : null,
    });
  }
  return { ok: true };
}

/**
 * Release active + re-reserve from current Other Items. Skips if already consumed.
 *
 * @param {string} email
 * @param {string} proposalId
 * @param {unknown} otherItems
 */
export async function syncInventoryReservationsForSimpleJob(email, proposalId, otherItems) {
  const e = email.trim().toLowerCase();
  const sid = String(proposalId || "").trim();
  if (!sid) return { ok: false, error: "simpleServiceProposalId required" };

  const consumed = await InventoryReservation.countDocuments({
    createdByEmail: e,
    simpleServiceProposalId: sid,
    status: "consumed",
  });
  if (consumed > 0) return { ok: true, skipped: true, reason: "already_consumed" };

  await releaseInventoryReservationsForSimple(e, sid);
  return reserveInventoryForSimpleJob(e, sid, otherItems, { force: true });
}

/**
 * Consume active Simple reservations when Job Status is Shipped.
 *
 * @param {string} email
 * @param {string} proposalId
 */
export async function consumeInventoryForSimpleOnShipped(email, proposalId) {
  const e = email.trim().toLowerCase();
  const sid = String(proposalId || "").trim();
  if (!sid) return { ok: true, skipped: true };

  const reservations = await InventoryReservation.find({
    createdByEmail: e,
    simpleServiceProposalId: sid,
    status: "active",
  });
  if (reservations.length === 0) return { ok: true, skipped: true };

  for (const r of reservations) {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: r.inventoryItemId, createdByEmail: e },
      { $inc: { onHand: -r.qty, reserved: -r.qty } },
      { new: true }
    ).lean();
    r.status = "consumed";
    await r.save();
    await recordInventoryMovement({
      createdByEmail: e,
      inventoryItemId: r.inventoryItemId,
      qty: -r.qty,
      type: "consume",
      simpleServiceProposalId: sid,
      reservationId: String(r._id),
      balanceAfter: item ? Number(item.onHand) || 0 : null,
    });
  }
  return { ok: true };
}

/**
 * Apply reserve / sync / consume / release for a Simple Service Proposal after save.
 *
 * @param {string} email
 * @param {string} proposalId
 * @param {{ recordType?: string, jobStatus?: string, otherItems?: unknown } | null | undefined} previous
 * @param {{ recordType?: string, jobStatus?: string, otherItems?: unknown }} next
 */
export async function applySimpleServiceProposalInventoryLifecycle(email, proposalId, previous, next) {
  const sid = String(proposalId || "").trim();
  if (!sid) return { ok: false, error: "proposalId required" };

  const prevType = String(previous?.recordType || "").trim().toUpperCase();
  const nextType = String(next?.recordType || "").trim().toUpperCase();
  const shipped = isShippedStatus(next?.jobStatus);

  if (prevType === "JOB" && nextType === "RFQ") {
    await releaseInventoryReservationsForSimple(email, sid);
    return { ok: true, action: "release" };
  }

  if (shipped) {
    if (nextType === "JOB" || nextType === "INVOICE") {
      await syncInventoryReservationsForSimpleJob(email, sid, next?.otherItems);
      await consumeInventoryForSimpleOnShipped(email, sid);
      return { ok: true, action: "consume" };
    }
  }

  if (nextType === "JOB") {
    await syncInventoryReservationsForSimpleJob(email, sid, next?.otherItems);
    return { ok: true, action: "sync" };
  }

  return { ok: true, skipped: true };
}

/**
 * Increase on-hand when a PO line is newly marked Received (logistics).
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {number} qty
 * @param {{ purchaseOrderId?: string, poLineId?: string, poNumber?: string, vendorName?: string, notes?: string }} [meta]
 */
export async function receiveInventoryFromPoLine(email, inventoryItemId, qty, meta = {}) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(qty) || qty <= 0) {
    return { ok: true, skipped: true };
  }
  const item = await InventoryItem.findOneAndUpdate(
    { _id: id, createdByEmail: e },
    { $inc: { onHand: qty } },
    { new: true }
  ).lean();
  if (!item) return { ok: false, error: "Inventory item not found" };

  await recordInventoryMovement({
    createdByEmail: e,
    inventoryItemId: id,
    qty,
    type: "receive_po",
    purchaseOrderId: meta.purchaseOrderId,
    poLineId: meta.poLineId,
    poNumber: meta.poNumber,
    vendorName: meta.vendorName,
    notes: meta.notes,
    balanceAfter: Number(item.onHand) || 0,
  });
  return { ok: true, item };
}

/**
 * Undo on-hand increase when a PO line receipt is reverted (logistics delete).
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {number} qty
 * @param {{ purchaseOrderId?: string, poLineId?: string, poNumber?: string, vendorName?: string, notes?: string }} [meta]
 */
export async function reverseReceiveInventoryFromPoLine(email, inventoryItemId, qty, meta = {}) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(qty) || qty <= 0) {
    return { ok: true, skipped: true };
  }
  const item = await InventoryItem.findOneAndUpdate(
    { _id: id, createdByEmail: e },
    { $inc: { onHand: -qty } },
    { new: true }
  ).lean();
  if (!item) return { ok: false, error: "Inventory item not found" };

  await recordInventoryMovement({
    createdByEmail: e,
    inventoryItemId: id,
    qty: -qty,
    type: "receive_po",
    purchaseOrderId: meta.purchaseOrderId,
    poLineId: meta.poLineId,
    poNumber: meta.poNumber,
    vendorName: meta.vendorName,
    notes: meta.notes || "Receipt reversed",
    reason: "reverse_receive",
    balanceAfter: Number(item.onHand) || 0,
  });
  return { ok: true, item };
}

/**
 * Manual stock adjust (delta). Writes adjust movement.
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {number} delta
 * @param {{ reason?: string, notes?: string }} [meta]
 */
export async function adjustInventoryOnHand(email, inventoryItemId, delta, meta = {}) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  const d = Number(delta);
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(d) || d === 0) {
    return { ok: false, error: "Invalid adjust" };
  }

  const current = await InventoryItem.findOne({ _id: id, createdByEmail: e });
  if (!current) return { ok: false, error: "Inventory item not found" };

  const nextOnHand = Math.max(0, (Number(current.onHand) || 0) + d);
  const applied = nextOnHand - (Number(current.onHand) || 0);
  if (applied === 0) {
    return { ok: false, error: "Adjust would not change on-hand" };
  }

  current.onHand = nextOnHand;
  await current.save();

  await recordInventoryMovement({
    createdByEmail: e,
    inventoryItemId: id,
    qty: applied,
    type: "adjust",
    reason: meta.reason,
    notes: meta.notes,
    balanceAfter: nextOnHand,
  });

  return { ok: true, item: current.toObject(), applied };
}

/**
 * Issue stock to a Simple job. Reduces matching active reservation when present.
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {{ qty: number, simpleServiceProposalId: string, documentNumber?: string, notes?: string }} opts
 */
export async function issueInventoryToJob(email, inventoryItemId, opts) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  const qty = Number(opts?.qty);
  const sid = String(opts?.simpleServiceProposalId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: "Invalid qty" };
  }
  if (!sid) return { ok: false, error: "Job required" };

  const item = await InventoryItem.findOne({ _id: id, createdByEmail: e });
  if (!item) return { ok: false, error: "Inventory item not found" };

  const onHand = Number(item.onHand) || 0;
  const reserved = Number(item.reserved) || 0;
  const available = onHand - reserved;
  if (qty > onHand) {
    return { ok: false, error: "Not enough on-hand quantity" };
  }

  const reservation = await InventoryReservation.findOne({
    createdByEmail: e,
    inventoryItemId: id,
    simpleServiceProposalId: sid,
    status: "active",
  });

  let reservedDelta = 0;
  if (reservation) {
    const resQty = Number(reservation.qty) || 0;
    const fromRes = Math.min(resQty, qty);
    reservedDelta = fromRes;
    if (fromRes >= resQty) {
      reservation.status = "consumed";
      await reservation.save();
    } else {
      reservation.qty = resQty - fromRes;
      await reservation.save();
    }
  } else if (qty > available) {
    return {
      ok: false,
      error: "Not enough available quantity (on-hand minus reserved)",
    };
  }

  item.onHand = onHand - qty;
  item.reserved = Math.max(0, reserved - reservedDelta);
  await item.save();

  const movement = await recordInventoryMovement({
    createdByEmail: e,
    inventoryItemId: id,
    qty: -qty,
    type: "issue_job",
    simpleServiceProposalId: sid,
    documentNumber: opts.documentNumber,
    reservationId: reservation ? String(reservation._id) : "",
    notes: opts.notes,
    balanceAfter: Number(item.onHand) || 0,
  });

  return { ok: true, item: item.toObject(), movement };
}

/**
 * Issue stock to shop use (no job link).
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {{ qty: number, reason?: string, notes?: string }} opts
 */
export async function issueInventoryToShop(email, inventoryItemId, opts) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  const qty = Number(opts?.qty);
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: "Invalid qty" };
  }

  const item = await InventoryItem.findOne({ _id: id, createdByEmail: e });
  if (!item) return { ok: false, error: "Inventory item not found" };

  const onHand = Number(item.onHand) || 0;
  const reserved = Number(item.reserved) || 0;
  const available = onHand - reserved;
  if (qty > available) {
    return { ok: false, error: "Not enough available quantity" };
  }

  item.onHand = onHand - qty;
  await item.save();

  const movement = await recordInventoryMovement({
    createdByEmail: e,
    inventoryItemId: id,
    qty: -qty,
    type: "issue_shop",
    reason: opts.reason,
    notes: opts.notes,
    balanceAfter: Number(item.onHand) || 0,
  });

  return { ok: true, item: item.toObject(), movement };
}

/**
 * Return previously issued stock to on-hand.
 *
 * @param {string} email
 * @param {string} inventoryItemId
 * @param {{ qty: number, relatedMovementId?: string, notes?: string, simpleServiceProposalId?: string }} opts
 */
export async function returnInventoryToStock(email, inventoryItemId, opts) {
  const e = email.trim().toLowerCase();
  const id = String(inventoryItemId || "").trim();
  const qty = Number(opts?.qty);
  if (!mongoose.Types.ObjectId.isValid(id) || !Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: "Invalid qty" };
  }

  const relatedId = String(opts?.relatedMovementId || "").trim();
  if (relatedId && mongoose.Types.ObjectId.isValid(relatedId)) {
    const prior = await InventoryMovement.findOne({
      _id: relatedId,
      createdByEmail: e,
      inventoryItemId: id,
      type: { $in: ["issue_job", "issue_shop"] },
    }).lean();
    if (!prior) return { ok: false, error: "Related issue movement not found" };
    const issued = Math.abs(Number(prior.qty) || 0);
    const alreadyReturned = await InventoryMovement.aggregate([
      {
        $match: {
          createdByEmail: e,
          inventoryItemId: new mongoose.Types.ObjectId(id),
          type: "return_stock",
          relatedMovementId: relatedId,
        },
      },
      { $group: { _id: null, total: { $sum: "$qty" } } },
    ]);
    const returnedSoFar = Number(alreadyReturned[0]?.total) || 0;
    if (returnedSoFar + qty > issued) {
      return { ok: false, error: "Return qty exceeds original issue" };
    }
  }

  const item = await InventoryItem.findOneAndUpdate(
    { _id: id, createdByEmail: e },
    { $inc: { onHand: qty } },
    { new: true }
  );
  if (!item) return { ok: false, error: "Inventory item not found" };

  const movement = await recordInventoryMovement({
    createdByEmail: e,
    inventoryItemId: id,
    qty,
    type: "return_stock",
    relatedMovementId: relatedId,
    simpleServiceProposalId: opts.simpleServiceProposalId,
    notes: opts.notes,
    balanceAfter: Number(item.onHand) || 0,
  });

  return { ok: true, item: item.toObject(), movement };
}
