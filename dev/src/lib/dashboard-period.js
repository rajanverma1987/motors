/** Preset ids for dashboard / reports period filter */
export const DASHBOARD_PERIOD_PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "quarter", label: "This quarter" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" },
  { id: "all", label: "All time" },
];

const DAY_MS = 86400000;

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * @param {string} preset - today | week | month | quarter | year | custom | all
 * @param {string} [customFromYmd] - YYYY-MM-DD
 * @param {string} [customToYmd] - YYYY-MM-DD
 * @returns {{ from: Date, to: Date } | null} null = all time
 */
export function getLocalDateRangeForPreset(preset, customFromYmd, customToYmd) {
  if (preset === "all" || !preset) return null;
  const now = new Date();

  if (preset === "custom") {
    if (!customFromYmd?.trim() || !customToYmd?.trim()) return null;
    const from = startOfLocalDay(new Date(customFromYmd + "T12:00:00"));
    const to = endOfLocalDay(new Date(customToYmd + "T12:00:00"));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
    return { from, to };
  }

  if (preset === "today") {
    return { from: startOfLocalDay(now), to: endOfLocalDay(now) };
  }

  if (preset === "week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + mondayOffset);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: startOfLocalDay(mon), to: endOfLocalDay(sun) };
  }

  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    const to = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    return { from, to };
  }

  if (preset === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { from, to };
  }

  return null;
}

export function rangeToQueryParams(range) {
  if (!range) return "";
  const p = new URLSearchParams();
  p.set("from", range.from.toISOString());
  p.set("to", range.to.toISOString());
  return p.toString();
}

/** @param {URLSearchParams} searchParams */
export function parseReportsRange(searchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from?.trim() || !to?.trim()) {
    return { allTime: true, fromMs: null, toMs: null };
  }
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
    return { allTime: true, fromMs: null, toMs: null };
  }
  return { allTime: false, fromMs, toMs };
}

function startOfUtcDayMs(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function startOfUtcWeekMs(ms) {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
}

/**
 * Time buckets for charts within [fromMs, toMs].
 * @returns {{ bucket: 'day'|'week'|'month', keys: string[], meta: { key: string, label: string, startMs: number, endMs: number }[] }}
 */
export function buildChartBuckets(fromMs, toMs) {
  const spanDays = Math.max(1, Math.ceil((toMs - fromMs) / DAY_MS) + 1);
  const meta = [];

  if (spanDays <= 31) {
    let t = startOfUtcDayMs(fromMs);
    const endDay = startOfUtcDayMs(toMs);
    while (t <= endDay) {
      const d = new Date(t);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const next = t + DAY_MS;
      meta.push({ key, label, startMs: t, endMs: Math.min(next - 1, toMs) });
      t = next;
    }
    return { bucket: "day", keys: meta.map((m) => m.key), meta };
  }

  if (spanDays <= 100) {
    let t = startOfUtcWeekMs(fromMs);
    let idx = 0;
    while (t <= toMs) {
      const weekEnd = t + 7 * DAY_MS - 1;
      const d = new Date(t);
      const key = `w:${d.toISOString().slice(0, 10)}`;
      const label = `Wk ${++idx} ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      meta.push({
        key,
        label,
        startMs: Math.max(t, fromMs),
        endMs: Math.min(weekEnd, toMs),
      });
      t += 7 * DAY_MS;
    }
    return { bucket: "week", keys: meta.map((m) => m.key), meta };
  }

  let y = new Date(fromMs).getUTCFullYear();
  let m = new Date(fromMs).getUTCMonth();
  const endY = new Date(toMs).getUTCFullYear();
  const endM = new Date(toMs).getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    const startMs = Date.UTC(y, m, 1);
    const endMs = Date.UTC(y, m + 1, 0, 23, 59, 59, 999);
    if (endMs >= fromMs && startMs <= toMs) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const label = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      meta.push({
        key,
        label,
        startMs: Math.max(startMs, fromMs),
        endMs: Math.min(endMs, toMs),
      });
    }
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (y > endY + 1) break;
  }
  if (meta.length === 0) {
    const d = new Date(fromMs);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    meta.push({
      key,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      startMs: fromMs,
      endMs: toMs,
    });
  }
  return { bucket: "month", keys: meta.map((x) => x.key), meta };
}

export function lastNMonthKeys(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(x.toISOString().slice(0, 7));
  }
  return out;
}

export function monthKeysMeta(keys) {
  return keys.map((key) => {
    const [y, mo] = key.split("-").map(Number);
    const label = new Date(y, mo - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const startMs = Date.UTC(y, mo - 1, 1);
    const endMs = Date.UTC(y, mo, 0, 23, 59, 59, 999);
    return { key, label, startMs, endMs };
  });
}

/** Which bucket index for createdAt timestamp */
export function bucketIndexForTime(tMs, chartMeta, bucketType) {
  if (!chartMeta?.length) return -1;
  if (bucketType === "day") {
    const k = new Date(tMs).toISOString().slice(0, 10);
    return chartMeta.findIndex((m) => m.key === k);
  }
  if (bucketType === "week") {
    for (let i = 0; i < chartMeta.length; i++) {
      const { startMs, endMs } = chartMeta[i];
      if (tMs >= startMs && tMs <= endMs) return i;
    }
    return -1;
  }
  const d = new Date(tMs);
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return chartMeta.findIndex((m) => m.key === key);
}

export function docInRange(doc, fromMs, toMs) {
  const t = doc?.createdAt ? new Date(doc.createdAt).getTime() : NaN;
  if (!Number.isFinite(t)) return false;
  return t >= fromMs && t <= toMs;
}
