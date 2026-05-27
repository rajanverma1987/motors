/**
 * Work order status buckets for lists, technician search, and job board.
 */

/** Dashboard Work orders → Closed tab: exact status label Close (case-insensitive). */
export const WORK_ORDER_CLOSE_LABEL_RX = /^close$/i;

/** Completed, cancelled, shipped, and similar — treated as closed for technician/mobile lists. */
export const WORK_ORDER_CLOSED_STATUS_RX =
  /^(completed?|complete|cancel|canceled|cancelled|closed|delivered|void|picked\s*up|picked|shipped|scrapped?|no\s*repair|rejected?)\b/i;

/** Normalized status key (lowercase letters/digits only) for reliable closed matching. */
export function workOrderStatusKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const WORK_ORDER_CLOSED_STATUS_KEYS = new Set([
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

/**
 * @param {string} status
 */
export function isWorkOrderClosedStatus(status) {
  const s = String(status || "").trim();
  if (!s) return false;
  if (WORK_ORDER_CLOSE_LABEL_RX.test(s)) return true;
  const key = workOrderStatusKey(s);
  if (WORK_ORDER_CLOSED_STATUS_KEYS.has(key)) return true;
  if (key.startsWith("closed")) return true;
  return WORK_ORDER_CLOSED_STATUS_RX.test(s);
}

/** Merge into a MongoDB query so lists only return non-closed work orders. */
export function withOpenWorkOrderStatusFilter(query) {
  return { $and: [query, workOrderActiveStatusQuery()] };
}

/**
 * Whether a work order status is treated as "open" / active for technician search / filters.
 * @param {string} status
 */
export function isWorkOrderOpenStatus(status) {
  return !isWorkOrderClosedStatus(status);
}

/** MongoDB filter fragment for closed work orders (merge into query). */
export function workOrderClosedStatusQuery() {
  return {
    $or: [
      { status: { $regex: WORK_ORDER_CLOSE_LABEL_RX } },
      { status: { $regex: WORK_ORDER_CLOSED_STATUS_RX } },
    ],
  };
}

/** MongoDB filter fragment for active (non-closed) work orders. */
export function workOrderActiveStatusQuery() {
  return {
    $nor: [
      { status: { $regex: WORK_ORDER_CLOSE_LABEL_RX } },
      { status: { $regex: WORK_ORDER_CLOSED_STATUS_RX } },
    ],
  };
}
