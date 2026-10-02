import TimeClockPunch from "@/models/TimeClockPunch";

export function serializePunch(doc) {
  const p = doc && (doc.toObject ? doc.toObject() : doc);
  if (!p) return null;
  return {
    id: p._id?.toString?.() || String(p.id || ""),
    employeeId: String(p.employeeId || ""),
    employeeName: String(p.employeeName || ""),
    employeeNumber: String(p.employeeNumber || ""),
    type: String(p.type || ""),
    punchedAt: p.punchedAt ? new Date(p.punchedAt).toISOString() : null,
    source: String(p.source || ""),
    lat: p.lat,
    lng: p.lng,
    accuracyM: p.accuracyM,
    distanceM: p.distanceM,
    note: String(p.note || ""),
    voidedAt: p.voidedAt ? new Date(p.voidedAt).toISOString() : null,
    voidReason: String(p.voidReason || ""),
  };
}

/** Local calendar date YYYY-MM-DD (shop-facing day boundaries). */
export function localDateIso(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function punchWorkDate(punchedAt) {
  return localDateIso(punchedAt);
}

/**
 * One row per local calendar day of the clock-in.
 * An Out after midnight stays on the shift's In date, so a day never shows
 * an Out without the In that opened it.
 * @param {Array} punches
 */
export function buildDailyPunchSummaries(punches) {
  const list = (Array.isArray(punches) ? punches : [])
    .filter((p) => !p?.voidedAt)
    .slice()
    .sort((a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime());

  const byDay = new Map();
  const ensure = (date) => {
    if (!byDay.has(date)) {
      byDay.set(date, { date, inAt: null, outAt: null, punchIds: [] });
    }
    return byDay.get(date);
  };
  const pushId = (row, raw) => {
    const id = raw._id?.toString?.() || String(raw.id || "");
    if (id && !row.punchIds.includes(id)) row.punchIds.push(id);
  };

  let openDate = "";

  for (const raw of list) {
    const type = String(raw.type || "");
    const at = raw.punchedAt ? new Date(raw.punchedAt) : null;
    if (!at || Number.isNaN(at.getTime())) continue;
    const atIso = at.toISOString();
    if (type === "in") {
      const date = punchWorkDate(atIso);
      if (!date) continue;
      openDate = date;
      const row = ensure(date);
      pushId(row, raw);
      if (!row.inAt || at.getTime() < new Date(row.inAt).getTime()) row.inAt = atIso;
      continue;
    }
    if (!openDate) continue;
    const row = ensure(openDate);
    pushId(row, raw);
    if (type === "out") {
      if (!row.outAt || at.getTime() > new Date(row.outAt).getTime()) row.outAt = atIso;
      openDate = "";
    }
  }

  return [...byDay.values()]
    .filter((row) => row.inAt)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Latest non-voided punch for employee; open session if type is in or break_*. */
export async function getOpenPunchState(shopEmail, employeeId) {
  const email = String(shopEmail || "").trim().toLowerCase();
  const eid = String(employeeId || "").trim();
  const last = await TimeClockPunch.findOne({
    createdByEmail: email,
    employeeId: eid,
    voidedAt: null,
  })
    .sort({ punchedAt: -1 })
    .lean();
  if (!last) {
    return { clockedIn: false, onBreak: false, nextType: "in", lastPunch: null };
  }
  const type = String(last.type || "");
  if (type === "out") {
    return { clockedIn: false, onBreak: false, nextType: "in", lastPunch: serializePunch(last) };
  }
  if (type === "break_start") {
    return { clockedIn: true, onBreak: true, nextType: "break_end", lastPunch: serializePunch(last) };
  }
  if (type === "break_end" || type === "in") {
    return { clockedIn: true, onBreak: false, nextType: "out", lastPunch: serializePunch(last) };
  }
  return { clockedIn: false, onBreak: false, nextType: "in", lastPunch: serializePunch(last) };
}

/**
 * Pair in/out punches into sessions and sum hours (minus breaks) for a list.
 * @param {Array} punches sorted ascending by punchedAt
 */
export function computeHoursFromPunches(punches) {
  const list = (Array.isArray(punches) ? punches : []).filter((p) => !p.voidedAt);
  let totalMs = 0;
  let openIn = null;
  let breakStart = null;
  let breakMs = 0;
  const days = new Map();

  const addDay = (iso, ms) => {
    const day = String(iso || "").slice(0, 10);
    if (!day) return;
    days.set(day, (days.get(day) || 0) + ms);
  };

  for (const p of list) {
    const t = String(p.type || "");
    const at = new Date(p.punchedAt).getTime();
    if (!Number.isFinite(at)) continue;
    if (t === "in") {
      openIn = at;
      breakStart = null;
      breakMs = 0;
    } else if (t === "break_start" && openIn != null) {
      breakStart = at;
    } else if (t === "break_end" && breakStart != null) {
      breakMs += Math.max(0, at - breakStart);
      breakStart = null;
    } else if (t === "out" && openIn != null) {
      if (breakStart != null) {
        breakMs += Math.max(0, at - breakStart);
        breakStart = null;
      }
      const worked = Math.max(0, at - openIn - breakMs);
      totalMs += worked;
      addDay(new Date(openIn).toISOString(), worked);
      openIn = null;
      breakMs = 0;
    }
  }

  return {
    totalHours: Math.round((totalMs / 3600000) * 100) / 100,
    byDay: [...days.entries()]
      .map(([date, ms]) => ({
        date,
        hours: Math.round((ms / 3600000) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function roundHours(ms) {
  return Math.round((Math.max(0, ms) / 3600000) * 100) / 100;
}

/**
 * Pair punches into sessions. A session stays on the local date of its clock-in.
 * @param {Array} punches
 * @returns {Array<{ date: string, inAt: string, outAt: string|null, breaks: Array<{ start: string, end: string|null }> }>}
 */
export function summarizePunchSessions(punches) {
  const list = (Array.isArray(punches) ? punches : [])
    .filter((p) => !p?.voidedAt)
    .slice()
    .sort((a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime());

  const sessions = [];
  let open = null;

  const closeBreak = (atIso) => {
    if (!open?.breakStart) return;
    open.breaks.push({ start: open.breakStart, end: atIso });
    open.breakStart = null;
  };

  const remember = (raw) => {
    if (!open) return;
    const id = raw._id?.toString?.() || String(raw.id || "");
    if (id && id !== "undefined" && !open.punchIds.includes(id)) open.punchIds.push(id);
  };

  for (const raw of list) {
    const type = String(raw.type || "");
    const at = raw.punchedAt ? new Date(raw.punchedAt) : null;
    if (!at || Number.isNaN(at.getTime())) continue;
    const atIso = at.toISOString();
    if (type === "in") {
      if (open) {
        if (open.breakStart) closeBreak(null);
        sessions.push(open);
      }
      open = {
        date: punchWorkDate(atIso),
        inAt: atIso,
        outAt: null,
        breaks: [],
        breakStart: null,
        punchIds: [],
      };
      remember(raw);
      continue;
    }
    if (!open) continue;
    remember(raw);
    if (type === "break_start") {
      if (!open.breakStart) open.breakStart = atIso;
      continue;
    }
    if (type === "break_end") {
      closeBreak(atIso);
      continue;
    }
    if (type === "out") {
      closeBreak(atIso);
      open.outAt = atIso;
      sessions.push(open);
      open = null;
    }
  }
  if (open) {
    if (open.breakStart) closeBreak(null);
    sessions.push(open);
  }
  return sessions.filter((session) => session.date && session.inAt);
}

/**
 * Hours and break time for one session.
 * An open shift counts only through `now` when its clock-in day is today.
 */
export function punchSessionMetrics(session, now = new Date()) {
  const start = new Date(session?.inAt || "").getTime();
  if (!Number.isFinite(start)) return null;
  const today = localDateIso(now);
  const open = !session.outAt;
  let end = session.outAt ? new Date(session.outAt).getTime() : null;
  if (!Number.isFinite(end) && session.date === today) end = now.getTime();

  let breakMs = 0;
  const breaks = [];
  for (const item of Array.isArray(session.breaks) ? session.breaks : []) {
    const bs = new Date(item.start || "").getTime();
    if (!Number.isFinite(bs)) continue;
    const be = item.end ? new Date(item.end).getTime() : Number.isFinite(end) ? end : null;
    if (Number.isFinite(be) && Number.isFinite(end)) {
      breakMs += Math.max(0, Math.min(be, end) - bs);
    } else if (Number.isFinite(be) && item.end) {
      breakMs += Math.max(0, be - bs);
    }
    breaks.push({ start: item.start, end: item.end || null });
  }

  return {
    inAt: session.inAt,
    outAt: session.outAt || null,
    open,
    hours: Number.isFinite(end) ? roundHours(end - start - breakMs) : null,
    breakHours: roundHours(breakMs),
    breaks,
  };
}

/** Inclusive local dates from `from` through `to`, capped. */
export function eachLocalDate(from, to, maxDays = 62) {
  const start = String(from || "").slice(0, 10);
  const end = String(to || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    return [];
  }
  const days = [];
  const [y, m, d] = start.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  while (days.length < maxDays) {
    const iso = localDateIso(cursor);
    if (!iso || iso > end) break;
    days.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function overlapMs(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

/**
 * Hours worked on one local calendar day.
 * A finished session is check-out minus check-in, minus breaks.
 * An open session (still checked in) runs from check-in to `now`.
 * Only the slice that falls on `dayIso` is counted.
 * @param {Array} punches
 * @param {string} dayIso YYYY-MM-DD local
 * @param {Date} [now]
 */
export function hoursOnLocalDay(punches, dayIso, now = new Date()) {
  const day = String(dayIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 0;
  const [year, month, date] = day.split("-").map(Number);
  const dayStart = new Date(year, month - 1, date, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(year, month - 1, date, 23, 59, 59, 999).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(dayStart) || !Number.isFinite(nowMs)) return 0;
  const cap = Math.min(nowMs, dayEnd);

  const list = (Array.isArray(punches) ? punches : [])
    .filter((p) => !p?.voidedAt)
    .slice()
    .sort((a, b) => new Date(a.punchedAt) - new Date(b.punchedAt));

  let totalMs = 0;
  let openIn = null;
  let breakStart = null;
  /** @type {Array<[number, number]>} */
  let breaks = [];

  const addSession = (endMs) => {
    if (openIn == null || !Number.isFinite(endMs) || endMs <= openIn) return;
    const closedBreaks = breaks.slice();
    if (breakStart != null && breakStart < endMs) closedBreaks.push([breakStart, endMs]);
    let ms = overlapMs(openIn, endMs, dayStart, cap);
    for (const [bs, be] of closedBreaks) {
      ms -= overlapMs(bs, be, dayStart, cap);
    }
    totalMs += Math.max(0, ms);
  };

  for (const p of list) {
    const t = String(p.type || "");
    const at = new Date(p.punchedAt).getTime();
    if (!Number.isFinite(at)) continue;
    if (t === "in") {
      openIn = at;
      breakStart = null;
      breaks = [];
    } else if (t === "break_start" && openIn != null) {
      breakStart = at;
    } else if (t === "break_end" && breakStart != null) {
      breaks.push([breakStart, at]);
      breakStart = null;
    } else if (t === "out" && openIn != null) {
      addSession(at);
      openIn = null;
      breakStart = null;
      breaks = [];
    }
  }

  if (openIn != null && nowMs >= dayStart && nowMs <= dayEnd) {
    addSession(nowMs);
  }

  return Math.round((totalMs / 3600000) * 100) / 100;
}

/**
 * Clocked plus manual hours strictly after a payment moment.
 * Punch time after `after` counts, including the rest of that same day.
 * Manual hours are stored by date only, so they count only on later calendar days.
 * @param {Array} punches
 * @param {Array<{ workDate?: string, hours?: number }>} manualEntries
 * @param {Date|string|number} after
 * @param {Date} [now]
 */
export function workedHoursAfter(punches, manualEntries, after, now = new Date()) {
  const afterMs = new Date(after).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(afterMs) || !Number.isFinite(nowMs) || nowMs <= afterMs) {
    return manualHoursAfterDate(manualEntries, afterMs);
  }

  const list = (Array.isArray(punches) ? punches : [])
    .filter((p) => !p?.voidedAt)
    .slice()
    .sort((a, b) => new Date(a.punchedAt) - new Date(b.punchedAt));

  let totalMs = 0;
  let openIn = null;
  let breakStart = null;
  /** @type {Array<[number, number]>} */
  let breaks = [];

  const addSession = (endMs) => {
    if (openIn == null || !Number.isFinite(endMs) || endMs <= openIn) return;
    const closedBreaks = breaks.slice();
    if (breakStart != null && breakStart < endMs) closedBreaks.push([breakStart, endMs]);
    let ms = overlapMs(openIn, endMs, afterMs, nowMs);
    for (const [bs, be] of closedBreaks) {
      ms -= overlapMs(bs, be, afterMs, nowMs);
    }
    totalMs += Math.max(0, ms);
  };

  for (const p of list) {
    const t = String(p.type || "");
    const at = new Date(p.punchedAt).getTime();
    if (!Number.isFinite(at)) continue;
    if (t === "in") {
      openIn = at;
      breakStart = null;
      breaks = [];
    } else if (t === "break_start" && openIn != null) {
      breakStart = at;
    } else if (t === "break_end" && breakStart != null) {
      breaks.push([breakStart, at]);
      breakStart = null;
    } else if (t === "out" && openIn != null) {
      addSession(at);
      openIn = null;
      breakStart = null;
      breaks = [];
    }
  }

  if (openIn != null) addSession(nowMs);

  const clocked = totalMs / 3600000;
  const manual = manualHoursAfterDate(manualEntries, afterMs);
  return Math.round((clocked + manual) * 100) / 100;
}

function manualHoursAfterDate(manualEntries, afterMs) {
  if (!Number.isFinite(afterMs)) return 0;
  const day = localDateIso(new Date(afterMs));
  let total = 0;
  for (const entry of Array.isArray(manualEntries) ? manualEntries : []) {
    const workDate = String(entry.workDate || entry.date || "").slice(0, 10);
    const hours = Number(entry.hours);
    if (!workDate || !Number.isFinite(hours) || hours <= 0) continue;
    if (workDate > day) total += hours;
  }
  return total;
}

export function lateEarlyFlags(punchedAtIso, scheduledStart, scheduledEnd, type) {
  const start = String(scheduledStart || "").trim();
  const end = String(scheduledEnd || "").trim();
  const d = punchedAtIso ? new Date(punchedAtIso) : null;
  if (!d || Number.isNaN(d.getTime())) return { late: false, early: false };
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  let late = false;
  let early = false;
  if (type === "in" && start && /^\d{2}:\d{2}$/.test(start) && hhmm > start) late = true;
  if (type === "out" && end && /^\d{2}:\d{2}$/.test(end) && hhmm < end) early = true;
  return { late, early };
}

/**
 * Combine punch-derived hours with manager-entered manual day hours.
 * @param {{ totalHours: number, byDay: Array<{ date: string, hours: number }> }} punchHours
 * @param {Array<{ workDate?: string, hours?: number }>} manualEntries
 */
export function mergeHoursWithManual(punchHours, manualEntries) {
  const base = punchHours && typeof punchHours === "object"
    ? punchHours
    : { totalHours: 0, byDay: [] };
  const byDay = new Map(
    (Array.isArray(base.byDay) ? base.byDay : []).map((d) => [
      String(d.date || "").slice(0, 10),
      Number(d.hours) || 0,
    ])
  );
  let manualTotal = 0;
  for (const entry of Array.isArray(manualEntries) ? manualEntries : []) {
    const day = String(entry.workDate || entry.date || "").slice(0, 10);
    const h = Number(entry.hours);
    if (!day || !Number.isFinite(h) || h <= 0) continue;
    manualTotal += h;
    byDay.set(day, Math.round(((byDay.get(day) || 0) + h) * 100) / 100);
  }
  const clockedHours = Math.round((Number(base.totalHours) || 0) * 100) / 100;
  const manualHours = Math.round(manualTotal * 100) / 100;
  return {
    clockedHours,
    manualHours,
    totalHours: Math.round((clockedHours + manualHours) * 100) / 100,
    byDay: [...byDay.entries()]
      .filter(([date]) => date)
      .map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function serializeManualHours(doc) {
  const p = doc && (doc.toObject ? doc.toObject() : doc);
  if (!p) return null;
  return {
    id: p._id?.toString?.() || String(p.id || ""),
    employeeId: String(p.employeeId || ""),
    employeeName: String(p.employeeName || ""),
    employeeNumber: String(p.employeeNumber || ""),
    workDate: String(p.workDate || "").slice(0, 10),
    hours: Math.round((Number(p.hours) || 0) * 100) / 100,
    note: String(p.note || ""),
    voidedAt: p.voidedAt ? new Date(p.voidedAt).toISOString() : null,
    voidReason: String(p.voidReason || ""),
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    createdByUserEmail: String(p.createdByUserEmail || ""),
  };
}

/** Validate YYYY-MM-DD and hours 0.01–24. */
export function parseManualHoursInput({ workDate, hours }) {
  const date = String(workDate || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "A valid work date (YYYY-MM-DD) is required." };
  }
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0 || n > 24) {
    return { error: "Hours must be greater than 0 and at most 24." };
  }
  return { workDate: date, hours: Math.round(n * 100) / 100 };
}
