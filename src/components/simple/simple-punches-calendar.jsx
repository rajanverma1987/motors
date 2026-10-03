"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
import SimpleEmployeeRecordPaymentModal from "@/components/simple/simple-employee-record-payment-modal";
import {
  normalizeShopWeek,
  previousShopWeek,
  shopWeekContaining,
  shopWeeksInRange,
} from "@/lib/shop-week";

const WEEK_PERIODS = [
  { id: "prev-week", label: "Previous week" },
  { id: "this-week", label: "This week" },
];

const MONTH_PERIODS = [
  { id: "prev-month", label: "Previous month" },
  { id: "this-month", label: "This month" },
];

const VIEWS = [
  { id: "by-day", label: "By day" },
  { id: "by-weeks", label: "By weeks" },
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

function todayIso() {
  return localIso(new Date());
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

function periodRange(period, weekStartDay, weekEndDay, customFrom, customTo) {
  const today = localIso(new Date());
  if (period === "prev-week") return previousShopWeek(today, weekStartDay, weekEndDay);
  if (period === "prev-month") return monthRange(shiftMonth(today, -1));
  if (period === "this-month") return monthRange(today);
  if (period === "custom") return { from: customFrom, to: customTo };
  return shopWeekContaining(today, weekStartDay, weekEndDay);
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

function formatWeekHeading(week) {
  const from = parseIso(week.from);
  const to = parseIso(week.to);
  if (!from || !to) return `${week.from} to ${week.to}`;
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const left = from.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const right = to.toLocaleDateString(
    undefined,
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" }
  );
  return `${left} to ${right}`;
}

function sessionLine(session, day) {
  const inTime = formatClock(session.inAt);
  const outTime = formatClock(session.outAt);
  const nextDay = Boolean(session.outAt) && localDayOf(session.outAt) !== day;
  if (session.outAt) return `${inTime} to ${outTime}${nextDay ? ", next day" : ""}`;
  if (session.open) return `${inTime}, still in`;
  return inTime || "-";
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function dayEntry(employee, day) {
  const raw = employee?.days?.[day];
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

function dayTotalHours(employee, day) {
  const { sessions, manualHours } = dayEntry(employee, day);
  const clocked = dayClockedHours(sessions);
  if (clocked == null && manualHours <= 0) return null;
  return round2((clocked || 0) + manualHours);
}

function hoursInDays(employee, dayList) {
  let total = 0;
  let any = false;
  for (const day of dayList) {
    const hours = dayTotalHours(employee, day);
    if (hours == null) continue;
    any = true;
    total += hours;
  }
  if (!any) return null;
  return round2(total);
}

function dayHasActivity(employee, day) {
  const { sessions, manualHours } = dayEntry(employee, day);
  return sessions.length > 0 || manualHours > 0;
}

function daysBetween(from, to) {
  const out = [];
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start || !end || end < start) return out;
  const cursor = new Date(start);
  while (cursor <= end && out.length < 62) {
    out.push(localIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** FIFO: apply lifetime paid hours after hours worked before the range. */
function allocatePaid(buckets, lifetimePaidHours, workedHoursBefore) {
  let remaining = Math.max(0, round2((Number(lifetimePaidHours) || 0) - (Number(workedHoursBefore) || 0)));
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

function sessionsAllPunchedOut(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (list.length === 0) return false;
  return list.every((session) => Boolean(session?.outAt) && !session?.open);
}

function weekSessionsAllPunchedOut(employee, weekDays) {
  let foundOut = false;
  for (const day of weekDays) {
    const { sessions } = dayEntry(employee, day);
    for (const session of sessions) {
      if (!session?.outAt || session.open) return false;
      foundOut = true;
    }
  }
  return foundOut;
}

function dayHoursPaid(payEnabled, allocation) {
  if (!payEnabled || allocation?.hours == null) return false;
  return Boolean(allocation.fullyPaid) || Number(allocation.unpaidHours) <= 0.001;
}

function PaidBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-success/15 px-1 py-0.5 text-[11px] font-bold text-success">
      <FiCheck className="h-3 w-3 shrink-0" aria-hidden />
      Paid
    </span>
  );
}

function PayStatus({ allocation, onMarkPaid, enabled = true, allowMarkPaid = true }) {
  if (!enabled || allocation?.hours == null) return null;
  if (allocation.fullyPaid || allocation.unpaidHours <= 0.001) return <PaidBadge />;
  if (!allowMarkPaid) return null;
  return (
    <button
      type="button"
      className="inline-flex w-fit items-center rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/15"
      onClick={() => onMarkPaid?.(allocation.unpaidHours)}
    >
      Mark paid
    </button>
  );
}

function DayCell({
  sessions,
  manualHours = 0,
  manualJobNumbers = [],
  day,
  allocation,
  canDelete,
  onDelete,
  onMarkPaid,
  payEnabled,
}) {
  const clocked = dayClockedHours(sessions);
  const total =
    clocked == null && manualHours <= 0 ? null : round2((clocked || 0) + manualHours);
  const jobLabel =
    Array.isArray(manualJobNumbers) && manualJobNumbers.length > 0
      ? manualJobNumbers.join(", ")
      : "";
  const hoursPaid = dayHoursPaid(payEnabled, allocation);
  const allowMarkPaid = sessionsAllPunchedOut(sessions);
  const showDelete = canDelete && sessions.length > 0 && !hoursPaid;
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <div className="flex items-start justify-between gap-1">
        {total != null ? (
          <p className="w-fit rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] font-bold tabular-nums text-primary">
            {total.toFixed(2)} hrs
          </p>
        ) : (
          <span />
        )}
        {showDelete ? (
          <button
            type="button"
            className="relative z-[1] inline-flex h-7 w-7 shrink-0 items-center justify-center text-danger hover:bg-danger/10"
            title="Delete day punches"
            aria-label="Delete day punches"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.();
            }}
          >
            <FiX className="pointer-events-none h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <PayStatus
        allocation={allocation}
        onMarkPaid={onMarkPaid}
        enabled={payEnabled}
        allowMarkPaid={allowMarkPaid}
      />
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
      {manualHours > 0 ? (
        <p className="w-fit rounded-sm bg-warning/15 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-warning">
          Manual {manualHours.toFixed(2)} hrs
          {jobLabel ? (
            <span className="mt-0.5 block text-[10px] font-bold text-warning">
              Job {jobLabel}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function WeekCell({ allocation, onMarkPaid, payEnabled, allowMarkPaid = true }) {
  if (allocation?.hours == null) return <span className="text-secondary">-</span>;
  return (
    <div className="flex flex-col gap-1 leading-tight">
      <p className="w-fit rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] font-bold tabular-nums text-primary">
        {allocation.hours.toFixed(2)} hrs
      </p>
      <PayStatus
        allocation={allocation}
        onMarkPaid={onMarkPaid}
        enabled={payEnabled}
        allowMarkPaid={allowMarkPaid}
      />
    </div>
  );
}

export default function SimplePunchesCalendar({
  reloadToken = 0,
  onOpenEmployee,
  onAddPunch,
  employeeOptions = [],
  canDelete = false,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const { settings } = useUserSettings();
  const { weekStartDay, weekEndDay } = normalizeShopWeek(
    settings?.weekStartDay,
    settings?.weekEndDay
  );
  const initialWeek = shopWeekContaining(localIso(new Date()), weekStartDay, weekEndDay);

  const [period, setPeriod] = useState("this-week");
  const [view, setView] = useState("by-day");
  const [customFrom, setCustomFrom] = useState(initialWeek.from);
  const [customTo, setCustomTo] = useState(initialWeek.to);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payEmployee, setPayEmployee] = useState(null);
  const [addHoursOpen, setAddHoursOpen] = useState(false);
  const [addHours, setAddHours] = useState({
    employeeId: "",
    workDate: todayIso(),
    hours: "",
    note: "",
  });

  const range = useMemo(
    () => periodRange(period, weekStartDay, weekEndDay, customFrom, customTo),
    [period, weekStartDay, weekEndDay, customFrom, customTo]
  );
  const rangeDays = dayCount(range.from, range.to);
  const rangeOk = rangeDays > 0 && rangeDays <= 62;

  const weeks = useMemo(
    () => shopWeeksInRange(range.from, range.to, weekStartDay, weekEndDay),
    [range.from, range.to, weekStartDay, weekEndDay]
  );

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
  const visibleEmployees = employees.filter((employee) =>
    days.some((day) => dayHasActivity(employee, day))
  );

  const dayAllocations = useMemo(() => {
    const byEmployee = new Map();
    for (const employee of visibleEmployees) {
      const buckets = days.map((day) => ({
        key: day,
        hours: dayTotalHours(employee, day),
      }));
      byEmployee.set(
        employee.employeeId,
        allocatePaid(buckets, employee.lifetimePaidHours, employee.workedHoursBefore)
      );
    }
    return byEmployee;
  }, [visibleEmployees, days]);

  const weekAllocations = useMemo(() => {
    const byEmployee = new Map();
    for (const employee of visibleEmployees) {
      const buckets = weeks.map((week) => {
        const weekDays = daysBetween(week.from, week.to).filter((day) => days.includes(day));
        return { key: week.key, hours: hoursInDays(employee, weekDays) };
      });
      byEmployee.set(
        employee.employeeId,
        allocatePaid(buckets, employee.lifetimePaidHours, employee.workedHoursBefore)
      );
    }
    return byEmployee;
  }, [visibleEmployees, weeks, days]);

  const openRecordPayment = (employee, options = {}) => {
    setPayEmployee({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      employeeNumber: employee.employeeNumber,
      payType: employee.payType || "hourly",
      hourlyRate: employee.hourlyRate || "",
      hours: options.hours,
      periodFrom: options.periodFrom || range.from,
      periodTo: options.periodTo || range.to,
    });
  };

  const markPaid = (employee, unpaidHours, periodFrom, periodTo) => {
    const hours = round2(unpaidHours);
    if (hours <= 0.001) return;
    openRecordPayment(employee, { hours, periodFrom, periodTo });
  };

  const deleteDay = async (employee, day) => {
    const allocation = dayAllocations.get(employee.employeeId)?.get(day);
    const hoursPaid = dayHoursPaid(employee.payType !== "salary", allocation);
    if (hoursPaid) {
      await alert({
        title: "Cannot delete",
        message: "This day's hours are paid. Remove or adjust the payment before deleting punches.",
        variant: "danger",
      });
      return;
    }
    const name = employee.employeeName || "this employee";
    const ok1 = await confirm({
      title: "Delete day punches",
      message: `Delete all punches for ${name} on ${formatDayHeading(day)}? A checkout after midnight on that shift is included.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: "Confirm delete",
      message: "This removes that day's punches from period totals. Continue?",
      confirmLabel: "Delete day",
      variant: "danger",
    });
    if (!ok2) return;
    const res = await fetch("/api/dashboard/time-clock/punches", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voidDay: true,
        employeeId: employee.employeeId,
        workDate: day,
        voidReason: "Day voided by shop admin",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({
        title: "Error",
        message: data.error || "Delete failed",
        variant: "danger",
      });
      return;
    }
    await load();
  };

  const openAddHours = () => {
    setAddHours({
      employeeId: "",
      workDate: range.to || todayIso(),
      hours: "",
      note: "",
    });
    setAddHoursOpen(true);
  };

  const submitAddHours = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/dashboard/time-clock/manual-hours", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: addHours.employeeId,
        workDate: addHours.workDate,
        hours: Number(addHours.hours),
        note: addHours.note,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({
        title: "Error",
        message: data.error || "Failed to save hours",
        variant: "danger",
      });
      return;
    }
    setAddHoursOpen(false);
    setAddHours({ employeeId: "", workDate: todayIso(), hours: "", note: "" });
    await load();
  };

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap items-center gap-3" aria-label="Punch period">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Week period">
              {WEEK_PERIODS.map((item) => (
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
            <div className="flex flex-wrap gap-1" role="group" aria-label="Month period">
              {MONTH_PERIODS.map((item) => (
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
            <button
              type="button"
              className={`${PILL} ${period === "custom" ? PILL_ON : PILL_OFF}`}
              aria-pressed={period === "custom"}
              onClick={() => setPeriod("custom")}
            >
              Custom
            </button>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Punch view">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${PILL} ${view === item.id ? PILL_ON : PILL_OFF}`}
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={openAddHours}>
            Manual hours
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={onAddPunch}>
            Add punch
          </Button>
        </div>
      </div>

      {!rangeOk ? (
        <p className="text-sm text-secondary">Choose a custom range of 62 days or fewer.</p>
      ) : loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : visibleEmployees.length === 0 ? (
        <p className="text-sm text-secondary">No punches or manual hours in this period.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto border border-border bg-card">
          <table className="w-max min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[8.5rem] border-b border-r border-border bg-card px-1.5 py-1 text-left text-[11px] font-bold text-title">
                  Employee
                </th>
                {view === "by-weeks"
                  ? weeks.map((week) => {
                      const coversToday = today >= week.from && today <= week.to;
                      return (
                        <th
                          key={week.key}
                          className={`sticky top-0 z-10 min-w-[8rem] border-b border-r border-border px-1.5 py-1 text-left text-[11px] font-bold ${
                            coversToday ? "bg-primary/15 text-primary" : "bg-card text-title"
                          }`}
                        >
                          {formatWeekHeading(week)}
                        </th>
                      );
                    })
                  : days.map((day) => (
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
              {visibleEmployees.map((employee) => {
                const periodHours = hoursInDays(employee, days);
                const dayMap = dayAllocations.get(employee.employeeId);
                const weekMap = weekAllocations.get(employee.employeeId);
                const payEnabled = employee.payType !== "salary";
                let periodUnpaid = 0;
                if (payEnabled && dayMap) {
                  for (const allocation of dayMap.values()) {
                    periodUnpaid += Number(allocation?.unpaidHours) || 0;
                  }
                  periodUnpaid = round2(periodUnpaid);
                }
                return (
                  <tr key={employee.employeeId}>
                    <th className="sticky left-0 z-20 min-w-[9.5rem] border-b border-r border-border bg-card px-1.5 py-1 text-left align-top text-[11px] font-semibold">
                      <button
                        type="button"
                        className="text-left text-sm font-bold text-primary hover:underline"
                        onClick={() => onOpenEmployee?.(employee)}
                      >
                        {employee.employeeName || "Employee"}
                      </button>
                      {employee.employeeNumber ? (
                        <p className="mt-0.5 font-normal text-secondary">#{employee.employeeNumber}</p>
                      ) : null}
                      {periodHours != null ? (
                        <p className="mt-1 w-fit rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                          {periodHours.toFixed(2)} total for this period
                        </p>
                      ) : null}
                      {payEnabled ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="tabular-nums text-[11px] text-secondary">
                            Unpaid hours{" "}
                            <span className="font-semibold text-title">{periodUnpaid.toFixed(2)}</span>
                          </span>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => openRecordPayment(employee)}
                          >
                            Record payment
                          </button>
                        </div>
                      ) : null}
                    </th>
                    {view === "by-weeks"
                      ? weeks.map((week) => {
                          const allocation = weekMap?.get(week.key);
                          const coversToday = today >= week.from && today <= week.to;
                          const weekDays = daysBetween(week.from, week.to).filter((day) =>
                            days.includes(day)
                          );
                          return (
                            <td
                              key={week.key}
                              className={`min-w-[8rem] overflow-hidden border-b border-r border-border px-1.5 py-1 align-top text-[11px] ${
                                coversToday ? "bg-primary/[0.06]" : ""
                              }`}
                            >
                              <WeekCell
                                allocation={allocation}
                                payEnabled={payEnabled}
                                allowMarkPaid={weekSessionsAllPunchedOut(employee, weekDays)}
                                onMarkPaid={(unpaid) =>
                                  markPaid(employee, unpaid, week.from, week.to)
                                }
                              />
                            </td>
                          );
                        })
                      : days.map((day) => {
                          const { sessions, manualHours, manualJobNumbers } = dayEntry(
                            employee,
                            day
                          );
                          const allocation = dayMap?.get(day);
                          const hasActivity = sessions.length > 0 || manualHours > 0;
                          return (
                            <td
                              key={day}
                              className={`min-w-[7.25rem] overflow-hidden border-b border-r border-border px-1.5 py-1 align-top text-[11px] ${
                                day === today ? "bg-primary/[0.06]" : ""
                              }`}
                            >
                              {!hasActivity ? (
                                <span className="text-secondary">-</span>
                              ) : (
                                <DayCell
                                  sessions={sessions}
                                  manualHours={manualHours}
                                  manualJobNumbers={manualJobNumbers}
                                  day={day}
                                  allocation={allocation}
                                  payEnabled={payEnabled}
                                  canDelete={canDelete}
                                  onDelete={() => void deleteDay(employee, day)}
                                  onMarkPaid={(unpaid) => markPaid(employee, unpaid, day, day)}
                                />
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

      <SimpleEmployeeRecordPaymentModal
        open={Boolean(payEmployee?.employeeId)}
        employee={payEmployee}
        onClose={() => setPayEmployee(null)}
        onSaved={() => {
          setPayEmployee(null);
          void load();
        }}
      />

      <Modal
        open={addHoursOpen}
        onClose={() => setAddHoursOpen(false)}
        title="Manual hours"
        size="md"
        actions={
          <Button type="submit" form="punches-add-hours-form" size="sm" variant="primary">
            Save
          </Button>
        }
      >
        <Form
          id="punches-add-hours-form"
          onSubmit={submitAddHours}
          className="flex flex-col gap-3 !space-y-0 !border-0 !p-0 !shadow-none"
        >
          <label className="text-xs font-bold">
            Employee
            <select
              required
              className="mt-1 h-8 w-full border border-border px-2 text-sm"
              value={addHours.employeeId}
              onChange={(e) => setAddHours((f) => ({ ...f, employeeId: e.target.value }))}
            >
              <option value="">Select…</option>
              {employeeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Date
            <input
              type="date"
              required
              className="mt-1 h-8 w-full border border-border px-2 text-sm"
              value={addHours.workDate}
              onChange={(e) => setAddHours((f) => ({ ...f, workDate: e.target.value }))}
            />
          </label>
          <label className="text-xs font-bold">
            Hours
            <input
              type="number"
              required
              min="0.01"
              max="24"
              step="0.01"
              className="mt-1 h-8 w-full border border-border px-2 text-sm"
              value={addHours.hours}
              onChange={(e) => setAddHours((f) => ({ ...f, hours: e.target.value }))}
              placeholder="e.g. 8"
            />
          </label>
          <label className="text-xs font-bold">
            Note (optional)
            <textarea
              rows={3}
              maxLength={500}
              className="mt-1 w-full border border-border px-2 py-1.5 text-sm"
              value={addHours.note}
              onChange={(e) => setAddHours((f) => ({ ...f, note: e.target.value }))}
              placeholder="Reason or description…"
            />
          </label>
        </Form>
      </Modal>
    </div>
  );
}
