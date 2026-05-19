import { clampString } from "@/lib/validation";
import { WRITE_UP_QUOTE_STATUS } from "@/lib/quote-rfq-lifecycle";

const MAX_LEN = 80;

/** Normalize quote status persisted on Quote documents (dashboard + repair flows). Lowercase so flows like work-order-from-quote (`approved`) stay consistent. */
export function normalizeDashboardQuoteStatusSlug(raw, { defaultStatus = "draft" } = {}) {
  const s = clampString(String(raw ?? "").trim(), MAX_LEN).toLowerCase();
  if (s) return s;
  const d = clampString(String(defaultStatus).trim(), MAX_LEN).toLowerCase();
  return d || "draft";
}

/** Default status for new RFQs created on the RFQ page. */
export function defaultNewRfqStatusSlug() {
  return WRITE_UP_QUOTE_STATUS;
}
