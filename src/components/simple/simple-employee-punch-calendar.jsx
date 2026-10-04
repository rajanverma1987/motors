"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { useAlert } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
import { clampWeekday } from "@/lib/shop-week";

const PERIODS = [
  { id: "this-month", label: "Current month" },
  { id: "prev-month", label: "Previous month" },
  { id: "custom", label: "Custom" },
];

const PILL =
  "inline-flex h-8 shrink-0 items-center border px-2.5 text-xs font-semibold";
const PILL_ON = "border-primary bg-primary/15 text-primary";
const PILL_OFF = "border-border bg-card text-title hover:border-primary/40";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function monthRange(anchorIso) {
  const date = parseIso(anchorIso);
  if (!date) return { from: anchorIso, to: anchorIso };
  const from = localIso(new Date(date.getFullYear(), date.getMonth(), 1));
  const to = localIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { from, to };
}

function shiftMonth(anchorIso, deltaMonths) {
  const date = parseIso(anchorIso);
  if (!date) return anchorIso;
  return localIso(new Date(date.getFullYear(), date.getMonth() + deltaMonths, 1));
}

function dayCount(from, to) {
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start || !end || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatClock(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function localDayOf(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return localIso(d);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function dayEntry(daysMap, day) {
  const raw = daysMap?.[day];
  if (!raw) return { sessions: [], manualHours: 0, manualJobNumbers: [] };
  if (Array.isArray(raw)) {
    return { sessions: raw, manualHours: 0, manualJobNumbers: [] };
  }
  const jobNumbers = Array.isArray(raw.manualJobNumbers)
    ? raw.manualJobNumbers.map((n) => String(n || "").trim()).filter(Boolean)
    : [];
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    manualHours: Math.max(0, Number(raw.manualHours) || 0),
    manualJobNumbers: [...new Set(jobNumbers)],
  };
}

function dayClockedHours(sessions) {
  const known = sessions.filter((session) => session.hours != null);
  if (!known.length) return null;
  const total = known.reduce((sum, session) => sum + (Number(session.hours) || 0), 0);
  return round2(total);
}

function dayTotalHours(daysMap, day) {
  const { sessions, manualHours } = dayEntry(daysMap, day);
  const clocked = dayClockedHours(sessions);
  if (clocked == null && manualHours <= 0) return null;
  return round2((clocked || 0) + manualHours);
}

function allocatePaid(buckets, lifetimePaidHours, workedHoursBefore) {
  let remaining = Math.max(
    0,
    round2((Number(lifetimePaidHours) || 0) - (Number(workedHoursBefore) || 0))
  );
  const map = new Map();
  for (const bucket of buckets) {
    const hours = bucket.hours == null ? null : Number(bucket.hours) || 0;
    if (hours == null || hours <= 0) {
      map.set(bucket.key, {
        hours,
        paidHours: 0,
        unpaidHours: hours == null ? 0 : hours,
        fullyPaid: false,
      });
      continue;
    }
    const paidHours = Math.min(hours, remaining);
    remaining = round2(remaining - paidHours);
    const unpaidHours = round2(hours - paidHours);
    map.set(bucket.key, {
      hours,
      paidHours,
      unpaidHours,
      fullyPaid: unpaidHours <= 0.001,
    });
  }
  return map;
}

function sessionLine(session, day) {
  const inTime = formatClock(session.inAt);
  const outTime = formatClock(session.outAt);
  const nextDay = Boolean(session.outAt) && localDayOf(session.outAt) !== day;
  if (session.outAt) return `${inTime} to ${outTime}${nextDay ? ", next day" : ""}`;
  if (session.open) return `${inTime}, still in`;
  return inTime || "-";
}

function sessionsAllPunchedOut(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (list.length === 0) return false;
  return list.every((session) => Boolean(session?.outAt) && !session?.open);
}

/** Build Outlook-style weeks covering from..to, padded to weekStartDay. */
function buildMonthWeeks(from, to, weekStartDay) {
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start || !end) return { weeks: [], weekdayLabels: [] };
  const startDow = clampWeekday(weekStartDay, 0);
  const labels = [];
  for (let i = 0; i < 7; i += 1) {
    labels.push(WEEKDAY_SHORT[(startDow + i) % 7]);
  }

  const gridStart = new Date(start);
  const offset = (gridStart.getDay() - startDow + 7) % 7;
  gridStart.setDate(gridStart.getDate() - offset);

  const gridEnd = new Date(end);
  const endOffset = (startDow + 6 - gridEnd.getDay() + 7) % 7;
  gridEnd.setDate(gridEnd.getDate() + endOffset);

  const weeks = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      const iso = localIso(cursor);
      week.push({
        iso,
        inRange: iso >= from && iso <= to,
        dayNumber: cursor.getDate(),
        weekdayShort: WEEKDAY_SHORT[cursor.getDay()],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, weekdayLabels: labels };
}

function OutlookDayCell({
  cell,
  sessions,
  manualHours,
  manualJobNumbers,
  allocation,
  payEnabled,
  today,
}) {
  const clocked = dayClockedHours(sessions);
  const total =
    clocked == null && manualHours <= 0 ? null : round2((clocked || 0) + manualHours);
  const jobLabel =
    Array.isArray(manualJobNumbers) && manualJobNumbers.length > 0
      ? manualJobNumbers.join(", ")
      : "";
  const hoursPaid =
    payEnabled &&
    allocation?.hours != null &&
    (allocation.fullyPaid || Number(allocation.unpaidHours) <= 0.001);
  const isToday = cell.iso === today;
  const muted = !cell.inRange;

  return (
    <div
      className={`flex min-h-[6.5rem] flex-col gap-0.5 border border-border p-1.5 ${
        muted ? "bg-bg/60 text-secondary" : "bg-card"
      } ${isToday ? "ring-1 ring-inset ring-primary/50" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-semibold uppercase tracking-wide ${
              isToday ? "text-primary" : "text-secondary"
            }`}
          >
            {cell.weekdayShort}
          </p>
          <p
            className={`text-sm font-bold tabular-nums leading-none ${
              isToday
                ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
                : muted
                  ? "text-secondary"
                  : "text-title"
            }`}
          >
            {cell.dayNumber}
          </p>
        </div>
        {total != null ? (
          <p className="w-fit shrink-0 rounded-sm bg-primary/15 px-1 py-0.5 text-[10px] font-bold tabular-nums text-primary">
            {total.toFixed(2)} hrs
          </p>
        ) : null}
      </div>

      {payEnabled && allocation?.hours != null ? (
        hoursPaid ? (
          <span className="inline-flex w-fit items-center gap-0.5 rounded-sm bg-success/15 px-1 py-0.5 text-[10px] font-bold text-success">
            <FiCheck className="h-2.5 w-2.5 shrink-0" aria-hidden />
            Paid
          </span>
        ) : sessionsAllPunchedOut(sessions) ? (
          <span className="inline-flex w-fit rounded-sm border border-primary/30 bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
            Unpaid
          </span>
        ) : null
      ) : null}

      {sessions.map((session, index) => (
        <p key={`${session.inAt}-${index}`} className="text-[10px] tabular-nums text-title">
          {sessionLine(session, cell.iso)}
        </p>
      ))}
      {sessions.flatMap((session, sessionIndex) =>
        (session.breaks || []).map((item, index) => {
          const start = formatClock(item.start);
          const end = formatClock(item.end);
          const label = end ? `${start} to ${end}` : `${start}, open`;
          return (
            <p
              key={`${session.inAt}-${sessionIndex}-brk-${index}`}
              className="text-[9px] tabular-nums text-secondary"
            >
              Break {label}
            </p>
          );
        })
      )}
      {manualHours > 0 ? (
        <p className="w-fit rounded-sm bg-warning/15 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-warning">
          Manual {manualHours.toFixed(2)} hrs
          {jobLabel ? (
            <span className="mt-0.5 block text-[9px] font-bold text-warning">Job {jobLabel}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Outlook-style punch calendar for one employee (month / previous / custom).
 */
export default function SimpleEmployeePunchCalendar({
  employeeId,
  open = true,
}) {
  const alert = useAlert();
  const { settings } = useUserSettings();
  const weekStartDay = clampWeekday(settings?.weekStartDay, 0);
  const today = localIso(new Date());
  const thisMonth = monthRange(today);

  const [period, setPeriod] = useState("this-month");
  const [customFrom, setCustomFrom] = useState(thisMonth.from);
  const [customTo, setCustomTo] = useState(thisMonth.to);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState(null);

  const range = useMemo(() => {
    if (period === "prev-month") return monthRange(shiftMonth(today, -1));
    if (period === "custom") return { from: customFrom, to: customTo };
    return monthRange(today);
  }, [period, customFrom, customTo, today]);

  const rangeOk = dayCount(range.from, range.to) > 0 && dayCount(range.from, range.to) <= 62;

  const { weeks, weekdayLabels } = useMemo(
    () => (rangeOk ? buildMonthWeeks(range.from, range.to, weekStartDay) : { weeks: [], weekdayLabels: [] }),
    [range.from, range.to, rangeOk, weekStartDay]
  );

  const fetchFrom = weeks[0]?.[0]?.iso || range.from;
  const fetchTo = weeks[weeks.length - 1]?.[6]?.iso || range.to;

  const load = useCallback(async () => {
    const id = String(employeeId || "").trim();
    if (!id || !open || !rangeOk) {
      setEmployee(null);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: "calendar",
        from: fetchFrom,
        to: fetchTo,
        employeeId: id,
      });
      const res = await fetch(`/api/dashboard/time-clock/punches?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load punches");
      const list = Array.isArray(data.employees) ? data.employees : [];
      setEmployee(
        list.find((e) => String(e.employeeId) === id) || {
          employeeId: id,
          payType: "hourly",
          lifetimePaidHours: 0,
          workedHoursBefore: 0,
          days: {},
        }
      );
    } catch (err) {
      setEmployee(null);
      await alert({
        title: "Error",
        message: err?.message || "Failed to load punch calendar",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [alert, employeeId, fetchFrom, fetchTo, open, rangeOk]);

  useEffect(() => {
    void load();
  }, [load]);

  const daysMap = employee?.days || {};
  const payEnabled = employee ? employee.payType !== "salary" : false;

  const dayAllocations = useMemo(() => {
    if (!employee || !rangeOk) return new Map();
    const keys = [];
    const cursor = parseIso(range.from);
    const end = parseIso(range.to);
    if (!cursor || !end) return new Map();
    while (cursor <= end) {
      const iso = localIso(cursor);
      keys.push(iso);
      cursor.setDate(cursor.getDate() + 1);
    }
    const buckets = keys.map((day) => ({
      key: day,
      hours: dayTotalHours(daysMap, day),
    }));
    return allocatePaid(buckets, employee.lifetimePaidHours, employee.workedHoursBefore);
  }, [employee, daysMap, range.from, range.to, rangeOk]);

  const periodLabel = useMemo(() => {
    const from = parseIso(range.from);
    const to = parseIso(range.to);
    if (!from || !to) return "";
    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
      return from.toLocaleString(undefined, { month: "long", year: "numeric" });
    }
    return `${range.from} to ${range.to}`;
  }, [range.from, range.to]);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="shrink-0 border-b border-border pb-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-secondary">Punch calendar</p>
        <p className="mt-0.5 text-xs text-secondary">{periodLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Punch calendar period">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${PILL} ${period === item.id ? PILL_ON : PILL_OFF}`}
              aria-pressed={period === item.id}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {period === "custom" ? (
          <>
            <label className="text-xs font-bold text-title">
              From
              <input
                type="date"
                className="mt-1 block h-8 border border-border bg-card px-2 text-sm text-title"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-title">
              To
              <input
                type="date"
                className="mt-1 block h-8 border border-border bg-card px-2 text-sm text-title"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>

      {!rangeOk ? (
        <p className="text-sm text-secondary">Choose a custom range of 62 days or fewer.</p>
      ) : loading ? (
        <p className="text-sm text-secondary">Loading punch calendar…</p>
      ) : (
        <div className="min-h-0 overflow-auto border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-bg">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="border-r border-border px-1.5 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-secondary last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flatMap((week) =>
              week.map((cell) => {
                const { sessions, manualHours, manualJobNumbers } = dayEntry(daysMap, cell.iso);
                return (
                  <OutlookDayCell
                    key={cell.iso}
                    cell={cell}
                    sessions={sessions}
                    manualHours={manualHours}
                    manualJobNumbers={manualJobNumbers}
                    allocation={dayAllocations.get(cell.iso)}
                    payEnabled={payEnabled}
                    today={today}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
