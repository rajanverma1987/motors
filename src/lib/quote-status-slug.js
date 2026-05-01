import { clampString } from "@/lib/validation";

const MAX_LEN = 80;

/** Normalize quote status persisted on Quote documents (dashboard + repair flows). Lowercase so flows like work-order-from-quote (`approved`) stay consistent. */
export function normalizeDashboardQuoteStatusSlug(raw) {
  const s = clampString(String(raw ?? "").trim(), MAX_LEN).toLowerCase();
  return s || "draft";
}
