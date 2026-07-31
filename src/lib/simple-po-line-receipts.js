import mongoose from "mongoose";
import {
  receiveInventoryFromPoLine,
  reverseReceiveInventoryFromPoLine,
} from "@/lib/inventory-service";
import { SIMPLE_PO_RECEIVING_STATUS_RECEIVED } from "@/lib/simple-purchase-order-form";

function normalizeReceivingStatus(raw) {
  const s = String(raw || "").trim();
  if (s === SIMPLE_PO_RECEIVING_STATUS_RECEIVED || /^received$/i.test(s)) {
    return SIMPLE_PO_RECEIVING_STATUS_RECEIVED;
  }
  return s;
}

function isReceivedStatus(raw) {
  return normalizeReceivingStatus(raw) === SIMPLE_PO_RECEIVING_STATUS_RECEIVED;
}

function lineReceiveQty(line) {
  const received = parseFloat(line?.receivedQty ?? "");
  if (Number.isFinite(received) && received > 0) return received;
  const ordered = parseFloat(line?.quantity ?? line?.qty ?? "1");
  if (Number.isFinite(ordered) && ordered > 0) return ordered;
  return 0;
}

function lineKey(line, index) {
  const id = String(line?.id || "").trim();
  if (id) return id;
  const inv = String(line?.inventoryItemId || "").trim();
  return `${index}:${inv}:${String(line?.itemName || line?.description || "").trim()}`;
}

/**
 * When Simple PO lines newly become Received (with inventoryItemId), increase on-hand.
 * When a previously Received linked line is no longer Received, reverse that qty.
 *
 * @param {string} email
 * @param {unknown} previousLineItems
 * @param {unknown} nextLineItems
 */
export async function applySimplePoInventoryReceipts(email, previousLineItems, nextLineItems) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return { ok: true };

  const prevLines = Array.isArray(previousLineItems) ? previousLineItems : [];
  const nextLines = Array.isArray(nextLineItems) ? nextLineItems : [];

  const prevByKey = new Map();
  prevLines.forEach((line, index) => {
    prevByKey.set(lineKey(line, index), line);
  });

  const nextByKey = new Map();
  nextLines.forEach((line, index) => {
    nextByKey.set(lineKey(line, index), line);
  });

  const keys = new Set([...prevByKey.keys(), ...nextByKey.keys()]);

  for (const key of keys) {
    const prev = prevByKey.get(key);
    const next = nextByKey.get(key);
    const wasReceived = prev ? isReceivedStatus(prev.receivingStatus) : false;
    const nowReceived = next ? isReceivedStatus(next.receivingStatus) : false;

    if (!wasReceived && nowReceived && next) {
      const invId = String(next.inventoryItemId || "").trim();
      if (!invId || !mongoose.Types.ObjectId.isValid(invId)) continue;
      const qty = lineReceiveQty(next);
      if (qty <= 0) continue;
      const recv = await receiveInventoryFromPoLine(e, invId, qty);
      if (!recv.ok) {
        console.error("Simple PO inventory receive:", recv.error, { invId, qty });
      }
      continue;
    }

    if (wasReceived && !nowReceived && prev) {
      const invId = String(prev.inventoryItemId || "").trim();
      if (!invId || !mongoose.Types.ObjectId.isValid(invId)) continue;
      const qty = lineReceiveQty(prev);
      if (qty <= 0) continue;
      const rev = await reverseReceiveInventoryFromPoLine(e, invId, qty);
      if (!rev.ok) {
        console.error("Simple PO inventory reverse:", rev.error, { invId, qty });
      }
    }
  }

  return { ok: true };
}
