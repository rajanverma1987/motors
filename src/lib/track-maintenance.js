/**
 * IQMotorTrack maintenance vocabulary and due-date maths (§6.8, §6.9).
 */

export const TRACK_MAINTENANCE_ACTIVITY_LABEL = {
  lubrication: "Lubrication",
  vibration_check: "Vibration check",
  insulation_resistance: "Insulation resistance test",
  thermal_scan: "Thermal scan",
  alignment: "Alignment",
  cleaning: "Cleaning",
  inspection: "Inspection",
  other: "Other",
};

export const TRACK_MAINTENANCE_ACTIVITY_OPTIONS = Object.entries(
  TRACK_MAINTENANCE_ACTIVITY_LABEL
).map(([value, label]) => ({ value, label }));

/** Activity types where a numeric reading is expected. */
export const TRACK_MAINTENANCE_READING_FIELDS = {
  insulation_resistance: [
    { key: "insulationResistanceMohm", label: "Insulation resistance (MΩ)" },
  ],
  vibration_check: [{ key: "vibrationInPerSec", label: "Vibration (in/sec)" }],
  thermal_scan: [{ key: "temperatureF", label: "Temperature (°F)" }],
};

export const TRACK_DUE_SOON_DAYS = 30;

/**
 * @param {Date|string|null|undefined} dueAt
 * @returns {"overdue"|"due_soon"|"scheduled"|"none"}
 */
export function trackDueState(dueAt) {
  if (!dueAt) return "none";
  const time = new Date(dueAt).getTime();
  if (!Number.isFinite(time)) return "none";
  const now = Date.now();
  if (time < now) return "overdue";
  if (time - now <= TRACK_DUE_SOON_DAYS * 86400000) return "due_soon";
  return "scheduled";
}

export const TRACK_DUE_STATE_LABEL = {
  overdue: "Overdue",
  due_soon: "Due within 30 days",
  scheduled: "Scheduled",
  none: "No due date",
};

export const TRACK_DUE_STATE_VARIANT = {
  overdue: "danger",
  due_soon: "warning",
  scheduled: "success",
  none: "default",
};

/**
 * Chartable reading series per motor, newest last so charts read left to right.
 * @param {{ activityType: string, performedAt: string, insulationResistanceMohm?: string, vibrationInPerSec?: string, temperatureF?: string }[]} logs
 */
export function trackReadingSeries(logs) {
  const rows = Array.isArray(logs) ? [...logs] : [];
  rows.sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());
  const insulation = [];
  const vibration = [];
  for (const log of rows) {
    const at = log.performedAt ? new Date(log.performedAt) : null;
    if (!at || Number.isNaN(at.getTime())) continue;
    const label = at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const ir = Number(log.insulationResistanceMohm);
    if (Number.isFinite(ir)) insulation.push({ label, value: ir });
    const vib = Number(log.vibrationInPerSec);
    if (Number.isFinite(vib)) vibration.push({ label, value: vib });
  }
  return { insulation, vibration };
}

/**
 * Earliest outstanding due date across a motor's activity types.
 * @param {{ activityType: string, nextDueAt: string|Date|null, performedAt: string|Date }[]} logs
 */
export function trackNextDueFromLogs(logs) {
  const latestPerType = new Map();
  for (const log of Array.isArray(logs) ? logs : []) {
    const type = String(log.activityType || "other");
    const at = new Date(log.performedAt || 0).getTime();
    const prev = latestPerType.get(type);
    if (!prev || at > prev.at) latestPerType.set(type, { at, nextDueAt: log.nextDueAt || null });
  }
  let earliest = null;
  for (const entry of latestPerType.values()) {
    if (!entry.nextDueAt) continue;
    const time = new Date(entry.nextDueAt).getTime();
    if (!Number.isFinite(time)) continue;
    if (earliest === null || time < earliest) earliest = time;
  }
  return earliest === null ? null : new Date(earliest);
}

/**
 * Per-activity-type due summary for the motor detail page.
 * @param {{ activityType: string, nextDueAt: string|Date|null, performedAt: string|Date }[]} logs
 */
export function trackDueByActivity(logs) {
  const latestPerType = new Map();
  for (const log of Array.isArray(logs) ? logs : []) {
    const type = String(log.activityType || "other");
    const at = new Date(log.performedAt || 0).getTime();
    const prev = latestPerType.get(type);
    if (!prev || at > prev.performedAtMs) {
      latestPerType.set(type, {
        activityType: type,
        performedAtMs: at,
        performedAt: log.performedAt || null,
        nextDueAt: log.nextDueAt || null,
      });
    }
  }
  return [...latestPerType.values()]
    .map((entry) => ({
      activityType: entry.activityType,
      label: TRACK_MAINTENANCE_ACTIVITY_LABEL[entry.activityType] || entry.activityType,
      performedAt: entry.performedAt,
      nextDueAt: entry.nextDueAt,
      dueState: trackDueState(entry.nextDueAt),
    }))
    .sort((a, b) => {
      const order = { overdue: 0, due_soon: 1, scheduled: 2, none: 3 };
      const diff = order[a.dueState] - order[b.dueState];
      if (diff !== 0) return diff;
      return a.label.localeCompare(b.label);
    });
}
