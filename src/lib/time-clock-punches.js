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
