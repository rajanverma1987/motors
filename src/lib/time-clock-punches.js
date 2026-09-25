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
 * One row per local calendar day: first In, last Out, and punch ids for that day.
 * @param {Array} punches
 */
export function buildDailyPunchSummaries(punches) {
  const byDay = new Map();
  for (const raw of Array.isArray(punches) ? punches : []) {
    if (raw?.voidedAt) continue;
    const date = punchWorkDate(raw.punchedAt);
    if (!date) continue;
    if (!byDay.has(date)) {
      byDay.set(date, {
        date,
        inAt: null,
        outAt: null,
        punchIds: [],
      });
    }
    const row = byDay.get(date);
    const id = raw._id?.toString?.() || String(raw.id || "");
    if (id) row.punchIds.push(id);
    const type = String(raw.type || "");
    const atIso = raw.punchedAt ? new Date(raw.punchedAt).toISOString() : null;
    if (!atIso) continue;
    if (type === "in") {
      if (!row.inAt || new Date(atIso) < new Date(row.inAt)) row.inAt = atIso;
    } else if (type === "out") {
      if (!row.outAt || new Date(atIso) > new Date(row.outAt)) row.outAt = atIso;
    }
  }
  return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
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
