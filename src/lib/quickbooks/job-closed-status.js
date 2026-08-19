/**
 * Shop-configured work-order statuses that trigger QuickBooks sync when a JOB enters them.
 */

/**
 * @param {unknown} raw
 * @param {string[]} workOrderStatuses
 * @returns {string[]}
 */
export function normalizeQuickBooksJobClosedStatuses(raw, workOrderStatuses) {
  const list = Array.isArray(workOrderStatuses) ? workOrderStatuses : [];
  /** @type {Map<string, string>} */
  const allowed = new Map();
  for (const s of list) {
    const label = String(s ?? "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (!allowed.has(key)) allowed.set(key, label);
  }

  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const label = String(item ?? "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    const canonical = allowed.get(key);
    if (!canonical) continue;
    seen.add(key);
    out.push(canonical);
    if (out.length >= 25) break;
  }

  if (out.length) return out;

  const completed = allowed.get("completed");
  if (completed) return [completed];
  if (list.length) {
    const first = String(list[0] ?? "").trim();
    return first ? [first] : ["Completed"];
  }
  return ["Completed"];
}

/**
 * @param {string} status
 * @param {string[]} closedStatuses
 */
export function isQuickBooksJobClosedStatus(status, closedStatuses) {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  if (!key) return false;
  const list = Array.isArray(closedStatuses) ? closedStatuses : [];
  return list.some((s) => String(s || "").trim().toLowerCase() === key);
}

/**
 * True when jobStatus moves from a non-closed status into a configured closed status.
 * @param {string} previousStatus
 * @param {string} nextStatus
 * @param {string[]} closedStatuses
 */
export function didEnterQuickBooksJobClosedStatus(previousStatus, nextStatus, closedStatuses) {
  const wasClosed = isQuickBooksJobClosedStatus(previousStatus, closedStatuses);
  const isClosed = isQuickBooksJobClosedStatus(nextStatus, closedStatuses);
  return !wasClosed && isClosed;
}
