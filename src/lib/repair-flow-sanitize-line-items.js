import { clampString } from "@/lib/validation";

const MAX_FLOW_LINE_ITEMS = 100;

/** Sanitize MotorRepairFlowQuote line items from client POST bodies. */
export function sanitizeFlowQuoteLineItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, MAX_FLOW_LINE_ITEMS)
    .map((li) => ({
      description: clampString(String(li?.description ?? ""), 2000),
      quantity: Math.max(0, Math.min(1e6, Number(li?.quantity) || 0)),
      unitPrice: Math.max(0, Math.min(1e9, Number(li?.unitPrice) || 0)),
      notes: clampString(String(li?.notes ?? ""), 2000),
      subjectToTeardown: Boolean(li?.subjectToTeardown),
    }))
    .filter((li) => li.description.length > 0);
}
