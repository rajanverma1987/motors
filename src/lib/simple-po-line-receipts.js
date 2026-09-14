import mongoose from "mongoose";
import InventoryItem from "@/models/InventoryItem";
import {
  receiveInventoryFromPoLine,
  reverseReceiveInventoryFromPoLine,
} from "@/lib/inventory-service";
import { SIMPLE_PO_RECEIVING_STATUS_RECEIVED } from "@/lib/simple-purchase-order-form";
import { clampString, clampStringCoerced } from "@/lib/validation";

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
 * Whether this receive should increase inventory.
 * Explicit false wins. Explicit true wins. Legacy linked lines (inventoryItemId, no flag) count as true.
 *
 * @param {object} line
 */
export function shouldAddPoLineToInventory(line) {
  if (line?.addToInventory === true) return true;
  if (line?.addToInventory === false) return false;
  return Boolean(String(line?.inventoryItemId || "").trim());
}

/**
 * Create an inventory SKU from a PO line description/UOM.
 *
 * @param {string} email
 * @param {object} line
 */
export async function createInventoryItemFromPoLine(email, line) {
  const e = String(email || "").trim().toLowerCase();
  const name =
    clampString(line?.itemName || line?.description || line?.inventoryName || "Part", 200).trim() ||
    "Part";
  const sku = clampString(line?.inventorySku || "", 100).trim();
  const uom = clampStringCoerced(line?.uom, 50).trim() || "ea";
  const doc = await InventoryItem.create({
    createdByEmail: e,
    name,
    sku,
    uom,
    onHand: 0,
    reserved: 0,
    threshold: 0,
    location: "",
    notes: "Created from purchase order receive",
  });
  return {
    id: doc._id.toString(),
    name: doc.name ?? name,
    sku: doc.sku ?? sku,
    uom: doc.uom ?? uom,
  };
}

/**
 * When Simple PO lines newly become Received and addToInventory, increase on-hand
 * (create SKU when needed). Reverse when leaving Received.
 *
 * @param {string} email
 * @param {unknown} previousLineItems
 * @param {unknown} nextLineItems
 * @param {{ purchaseOrderId?: string, poNumber?: string, vendorName?: string }} [poMeta]
 * @returns {Promise<{ ok: true, lineItems: object[], mutated: boolean }>}
 */
export async function applySimplePoInventoryReceipts(
  email,
  previousLineItems,
  nextLineItems,
  poMeta = {}
) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return { ok: true, lineItems: Array.isArray(nextLineItems) ? nextLineItems : [], mutated: false };

  const prevLines = Array.isArray(previousLineItems) ? previousLineItems : [];
  const nextLines = Array.isArray(nextLineItems) ? nextLineItems.map((l) => ({ ...l })) : [];

  const prevByKey = new Map();
  prevLines.forEach((line, index) => {
    prevByKey.set(lineKey(line, index), line);
  });

  const nextByKey = new Map();
  nextLines.forEach((line, index) => {
    nextByKey.set(lineKey(line, index), { line, index });
  });

  const keys = new Set([...prevByKey.keys(), ...nextByKey.keys()]);
  let mutated = false;

  const metaBase = {
    purchaseOrderId: String(poMeta.purchaseOrderId || "").trim(),
    poNumber: String(poMeta.poNumber || "").trim(),
    vendorName: String(poMeta.vendorName || "").trim(),
  };

  for (const key of keys) {
    const prev = prevByKey.get(key);
    const nextEntry = nextByKey.get(key);
    const next = nextEntry?.line;
    const nextIndex = nextEntry?.index;
    const wasReceived = prev ? isReceivedStatus(prev.receivingStatus) : false;
    const nowReceived = next ? isReceivedStatus(next.receivingStatus) : false;

    if (!wasReceived && nowReceived && next && nextIndex != null) {
      if (!shouldAddPoLineToInventory(next)) continue;
      const qty = lineReceiveQty(next);
      if (qty <= 0) continue;

      let invId = String(next.inventoryItemId || "").trim();
      if (!invId || !mongoose.Types.ObjectId.isValid(invId)) {
        const created = await createInventoryItemFromPoLine(e, next);
        invId = created.id;
        nextLines[nextIndex] = {
          ...next,
          inventoryItemId: created.id,
          inventoryName: created.name,
          inventorySku: created.sku,
          addToInventory: true,
        };
        mutated = true;
      }

      const recv = await receiveInventoryFromPoLine(e, invId, qty, {
        ...metaBase,
        poLineId: String(next.id || "").trim(),
      });
      if (!recv.ok) {
        throw new Error(recv.error || "Inventory receive failed");
      }
      continue;
    }

    if (wasReceived && !nowReceived && prev) {
      if (!shouldAddPoLineToInventory(prev)) continue;
      const invId = String(prev.inventoryItemId || "").trim();
      if (!invId || !mongoose.Types.ObjectId.isValid(invId)) continue;
      const qty = lineReceiveQty(prev);
      if (qty <= 0) continue;
      const rev = await reverseReceiveInventoryFromPoLine(e, invId, qty, {
        ...metaBase,
        poLineId: String(prev.id || "").trim(),
      });
      if (!rev.ok) {
        throw new Error(rev.error || "Inventory reverse receive failed");
      }
    }
  }

  return { ok: true, lineItems: nextLines, mutated };
}
