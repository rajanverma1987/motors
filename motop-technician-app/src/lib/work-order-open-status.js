/**
 * Keep in sync with src/lib/work-order-open-status.js (server).
 */

const CLOSE_RX = /^close$/i;
const CLOSED_RX =
  /^(completed?|complete|cancel|canceled|cancelled|closed|delivered|void|picked\s*up|picked|shipped|scrapped?|no\s*repair|rejected?)\b/i;

const CLOSED_KEYS = new Set([
  "close",
  "closed",
  "complete",
  "completed",
  "cancel",
  "canceled",
  "cancelled",
  "delivered",
  "void",
  "pickedup",
  "picked",
  "shipped",
  "scrapped",
  "scrap",
  "norepair",
  "rejected",
  "reject",
]);

function statusKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function isWorkOrderClosedStatus(status) {
  const s = String(status || "").trim();
  if (!s) return false;
  if (CLOSE_RX.test(s)) return true;
  const key = statusKey(s);
  if (CLOSED_KEYS.has(key)) return true;
  if (key.startsWith("closed")) return true;
  return CLOSED_RX.test(s);
}

export function isWorkOrderOpenStatus(status) {
  return !isWorkOrderClosedStatus(status);
}

/** @param {Array<{ status?: string }>} rows */
export function filterOpenWorkOrders(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((w) => isWorkOrderOpenStatus(w.status));
}
