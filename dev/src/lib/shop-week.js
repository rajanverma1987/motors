/** Shop week helpers. Days use JS getDay(): 0 Sunday … 6 Saturday. */

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function clampWeekday(value, fallback = 0) {
  const n = Number(value);
  if (Number.isInteger(n) && n >= 0 && n <= 6) return n;
  return fallback;
}

/** Inclusive day count from start weekday to end weekday, wrapping. */
export function shopWeekLength(startDay, endDay) {
  const start = clampWeekday(startDay, 0);
  const end = clampWeekday(endDay, 6);
  return ((end - start + 7) % 7) + 1;
}

/**
 * End-day choices for a start day.
 * Days that fall before the start day (Sun…Sat order), wrap-around for Sunday start.
 * Week length must be at least 3 days (no two-day weeks).
 */
export function allowedWeekEndDays(startDay) {
  const start = clampWeekday(startDay, 0);
  const out = [];
  if (start === 0) {
    for (let back = 1; back <= 5; back += 1) {
      out.push((0 - back + 7) % 7);
    }
    return out;
  }
  for (let end = 0; end < start; end += 1) {
    if (shopWeekLength(start, end) >= 3) out.push(end);
  }
  return out;
}

export function normalizeShopWeek(startDay, endDay) {
  const weekStartDay = clampWeekday(startDay, 0);
  const allowed = allowedWeekEndDays(weekStartDay);
  const preferred = clampWeekday(endDay, allowed[0] ?? 6);
  const weekEndDay = allowed.includes(preferred) ? preferred : allowed[0] ?? 6;
  return { weekStartDay, weekEndDay };
}

function localIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Shop week that contains `anchorIso` (YYYY-MM-DD local).
 * @returns {{ from: string, to: string }}
 */
export function shopWeekContaining(anchorIso, startDay, endDay) {
  const { weekStartDay, weekEndDay } = normalizeShopWeek(startDay, endDay);
  const date = parseIso(anchorIso);
  if (!date) return { from: String(anchorIso || "").slice(0, 10), to: String(anchorIso || "").slice(0, 10) };
  const diff = (date.getDay() - weekStartDay + 7) % 7;
  date.setDate(date.getDate() - diff);
  const from = localIso(date);
  const length = shopWeekLength(weekStartDay, weekEndDay);
  date.setDate(date.getDate() + length - 1);
  return { from, to: localIso(date) };
}

export function previousShopWeek(anchorIso, startDay, endDay) {
  const current = shopWeekContaining(anchorIso, startDay, endDay);
  const start = parseIso(current.from);
  if (!start) return current;
  start.setDate(start.getDate() - 1);
  return shopWeekContaining(localIso(start), startDay, endDay);
}

/**
 * Split an inclusive date range into shop weeks (clipped to the range).
 * @returns {Array<{ from: string, to: string, key: string }>}
 */
export function shopWeeksInRange(rangeFrom, rangeTo, startDay, endDay) {
  const from = String(rangeFrom || "").slice(0, 10);
  const to = String(rangeTo || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return [];
  }
  const weeks = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 40) {
    guard += 1;
    const week = shopWeekContaining(cursor, startDay, endDay);
    const clipFrom = week.from < from ? from : week.from;
    const clipTo = week.to > to ? to : week.to;
    if (clipFrom <= clipTo) {
      weeks.push({ from: clipFrom, to: clipTo, key: `${week.from}_${week.to}` });
    }
    const next = parseIso(week.to);
    if (!next) break;
    next.setDate(next.getDate() + 1);
    cursor = localIso(next);
  }
  return weeks;
}
