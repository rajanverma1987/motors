/**
 * Inclusive list of YYYY-MM keys from fromYmd..toYmd (or last 12 months if empty).
 * Safe for client and server.
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function listMonthKeys(fromYmd, toYmd) {
  const from = String(fromYmd || "").trim().slice(0, 10);
  const to = String(toYmd || "").trim().slice(0, 10);
  let start;
  let end;
  if (/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    start = new Date(`${from.slice(0, 7)}-01T12:00:00Z`);
    end = new Date(`${to.slice(0, 7)}-01T12:00:00Z`);
  } else {
    end = new Date();
    end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  }
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const keys = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return keys;
}
