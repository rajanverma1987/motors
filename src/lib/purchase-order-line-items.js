import { LIMITS, clampString } from "@/lib/validation";

export const MAX_PO_LINE_ITEMS = 100;

export function normalizeLineItemStatus(row) {
  const s = row?.status;
  if (s === "Received") return "Received";
  if (s === "Back Order") return "Back Order";
  if (s === "Delivered" || s === "Dispatch") return "Dispatch";
  return "Ordered";
}

function clampInventoryItemId(raw) {
  const id = String(raw ?? "").trim();
  if (!/^[a-f0-9]{24}$/i.test(id)) return "";
  return id;
}

/**
 * Normalizes PO line items for create/update APIs.
 * Persists optional inventoryItemId for receiving → stock.
 */
export function normalizePurchaseOrderLineItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_PO_LINE_ITEMS).map((row) => {
    const invId = clampInventoryItemId(row?.inventoryItemId);
    const o = {
      description: clampString(row?.description, LIMITS.shortText.max),
      qty: clampString(String(row?.qty ?? "1"), 50),
      uom: clampString(row?.uom, 20),
      unitPrice: clampString(row?.unitPrice, 50),
      status: normalizeLineItemStatus(row),
    };
    if (invId) o.inventoryItemId = invId;
    return o;
  });
}
