"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import { useAlert } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";

const PERIODS = [
  { id: "prev-week", label: "Previous week" },
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "custom", label: "Custom" },
];

const PILL =
  "inline-flex h-8 shrink-0 items-center border px-2.5 text-xs font-semibold";
const PILL_ON = "border-primary bg-primary/15 text-primary";
const PILL_OFF = "border-border bg-card text-title hover:border-primary/40";

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

function shiftIso(iso, days) {
  const date = parseIso(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return localIso(date);
}

function weekRange(anchorIso, weekStartsOn) {
  const date = parseIso(anchorIso);
  if (!date) return { from: anchorIso, to: anchorIso };
  const start = weekStartsOn === 1 ? 1 : 0;
  const diff = (date.getDay() - start + 7) % 7;
  date.setDate(date.getDate() - diff);
  const from = localIso(date);
  date.setDate(date.getDate() + 6);
  return { from, to: localIso(date) };
}

function monthRange(anchorIso) {
  const date = parseIso(anchorIso);
  if (!date) return { from: anchorIso, to: anchorIso };
  const from = localIso(new Date(date.getFullYear(), date.getMonth(), 1));
  const to = localIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { from, to };
}

function periodRange(period, weekStartsOn, customFrom, customTo) {
  const today = localIso(new Date());
  if (period === "prev-week") {
    const current = weekRange(today, weekStartsOn);
    return weekRange(shiftIso(current.from, -1), weekStartsOn);
  }
  if (period === "this-month") return monthRange(today);
  if (period === "custom") return { from: customFrom, to: customTo };
  return weekRange(today, weekStartsOn);
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

function formatDayHeading(iso) {
  const date = parseIso(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function sessionLine(session, day) {
  const inTime = formatClock(session.inAt);
  const outTime = formatClock(session.outAt);
  const nextDay = Boolean(session.outAt) && localDayOf(session.outAt) !== day;
  if (session.outAt) return `${inTime} to ${outTime}${nextDay ? ", next day" : ""}`;
  if (session.open) return `${inTime}, still in`;
  return inTime || "-";
}

function dayTotalHours(sessions) {
  const known = sessions.filter((session) => session.hours != null);
  if (!known.length) return null;
  const total = known.reduce((sum, session) => sum + (Number(session.hours) || 0), 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

function periodTotalHours(employee, days) {
  let total = 0;
  let any = false;
  for (const day of days) {
    const hours = dayTotalHours(employee.days?.[day] || []);
    if (hours == null) continue;
    any = true;
    total += hours;
  }
  if (!any) return null;
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

function DayCell({ sessions, day }) {
  const total = dayTotalHours(sessions);
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      {total != null ? (
        <p className="w-fit rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] font-bold tabular-nums text-primary">
          {total.toFixed(2)} hrs
        </p>
      ) : null}
      {sessions.map((session, index) => (
        <p key={`${session.inAt}-${index}`} className="tabular-nums text-title">
          {sessionLine(session, day)}
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
              className="tabular-nums text-[10px] text-secondary"
            >
              Break {label}
            </p>
          );
        })
      )}
    </div>
  );
}

export default function SimplePunchesCalendar({ reloadToken = 0, onOpenEmployee, onAddPunch }) {
  const alert = useAlert();
  const { settings } = useUserSettings();
  const weekStartsOn = Number(settings?.weekStartsOn) === 1 ? 1 : 0;
  const initialWeek = weekRange(localIso(new Date()), weekStartsOn);

  const [period, setPeriod] = useState("this-week");
  const [customFrom, setCustomFrom] = useState(initialWeek.from);
  const [customTo, setCustomTo] = useState(initialWeek.to);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState([]);
  const [employees, setEmployees] = useState([]);

  const range = useMemo(
    () => periodRange(period, weekStartsOn, customFrom, customTo),
    [period, weekStartsOn, customFrom, customTo]
  );
  const rangeDays = dayCount(range.from, range.to);
  const rangeOk = rangeDays > 0 && rangeDays <= 62;

  const load = useCallback(async () => {
    if (!rangeOk) {
      setDays([]);
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: "calendar",
        from: range.from,
        to: range.to,
      });
      const res = await fetch(`/api/dashboard/time-clock/punches?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load punches");
      setDays(Array.isArray(data.days) ? data.days : []);
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (err) {
      setDays([]);
      setEmployees([]);
      await alert({
        title: "Error",
        message: err?.message || "Failed to load punches",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [alert, range.from, range.to, rangeOk]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const today = localIso(new Date());

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Punch period">
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
        <Button type="button" size="sm" variant="primary" onClick={onAddPunch}>
          Add punch
        </Button>
      </div>

      {!rangeOk ? (
        <p className="text-sm text-secondary">Choose a custom range of 62 days or fewer.</p>
      ) : loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-secondary">No employees on the time clock yet.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto border border-border bg-card">
          <table className="w-max min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[8.5rem] border-b border-r border-border bg-card px-1.5 py-1 text-left text-[11px] font-bold text-title">
                  Employee
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className={`sticky top-0 z-10 min-w-[7.25rem] border-b border-r border-border px-1.5 py-1 text-left text-[11px] font-bold ${
                      day === today ? "bg-primary/15 text-primary" : "bg-card text-title"
                    }`}
                  >
                    {formatDayHeading(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const periodHours = periodTotalHours(employee, days);
                return (
                <tr key={employee.employeeId}>
                  <th className="sticky left-0 z-20 min-w-[8.5rem] border-b border-r border-border bg-card px-1.5 py-1 text-left align-top text-[11px] font-semibold">
                    <button
                      type="button"
                      className="text-left text-primary hover:underline"
                      onClick={() => onOpenEmployee?.(employee)}
                    >
                      {employee.employeeName || "Employee"}
                    </button>
                    {employee.employeeNumber ? (
                      <p className="mt-0.5 font-normal text-secondary">#{employee.employeeNumber}</p>
                    ) : null}
                    {periodHours != null ? (
                      <p className="mt-1 w-fit rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                        {periodHours.toFixed(2)} hrs
                      </p>
                    ) : null}
                  </th>
                  {days.map((day) => {
                    const sessions = employee.days?.[day] || [];
                    return (
                      <td
                        key={day}
                        className={`min-w-[7.25rem] border-b border-r border-border px-1.5 py-1 align-top text-[11px] ${
                          day === today ? "bg-primary/[0.06]" : ""
                        }`}
                      >
                        {sessions.length === 0 ? (
                          <span className="text-secondary">-</span>
                        ) : (
                          <DayCell sessions={sessions} day={day} />
                        )}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
