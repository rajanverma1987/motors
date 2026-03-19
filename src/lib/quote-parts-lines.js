import { LIMITS, clampString } from "@/lib/validation";

export const MAX_QUOTE_PARTS_LINES = 100;

function clampInventoryItemId(raw) {
  const id = String(raw ?? "").trim();
  if (!/^[a-f0-9]{24}$/i.test(id)) return "";
  return id;
}

/** Normalize quote "Other cost" / parts lines for create & update APIs. */
export function normalizeQuotePartsLines(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_QUOTE_PARTS_LINES).map((row) => {
    const invId = clampInventoryItemId(row?.inventoryItemId);
    const o = {
      item: clampString(row?.item, 200),
      qty: clampString(String(row?.qty ?? "1"), 50),
      uom: clampString(row?.uom, 50),
      price: clampString(row?.price, 50),
    };
    if (invId) o.inventoryItemId = invId;
    return o;
  });
}
