import EmployeePayrollPayment from "@/models/EmployeePayrollPayment";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import TimeClockPunch from "@/models/TimeClockPunch";
import { periodMonthBounds } from "@/lib/employee-payroll-payment";
import {
  localDateIso,
  workedHoursAfter,
} from "@/lib/time-clock-punches";

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function leftoverHours(payment) {
  const due = payment?.hoursDue;
  if (due == null || due === "") return 0;
  const hoursDue = Number(due);
  if (!Number.isFinite(hoursDue)) return 0;
  return Math.max(0, round2(hoursDue - (Number(payment.hours) || 0)));
}

async function monthHoursForEmployee(owner, employeeId, periodMonth, until = new Date()) {
  const bounds = periodMonthBounds(periodMonth);
  if (!bounds) return 0;
  const untilDay = localDateIso(until);
  const toDay = untilDay && untilDay < bounds.to ? untilDay : bounds.to;
  const rangeEnd = new Date(`${bounds.to}T23:59:59.999`);
  const cap = until.getTime() < rangeEnd.getTime() ? until : rangeEnd;
  const [punches, manuals] = await Promise.all([
    TimeClockPunch.find({
      createdByEmail: owner,
      employeeId,
      voidedAt: null,
      punchedAt: {
        $gte: new Date(`${bounds.from}T00:00:00.000`),
        $lte: cap,
      },
    })
      .sort({ punchedAt: 1 })
      .lean(),
    TimeClockManualHours.find({
      createdByEmail: owner,
      employeeId,
      voidedAt: null,
      workDate: { $gte: bounds.from, $lte: toDay },
    }).lean(),
  ]);
  const monthStart = new Date(`${bounds.from}T00:00:00.000`);
  return workedHoursAfter(punches, manuals, new Date(monthStart.getTime() - 1), cap);
}

/**
 * Unpaid hourly hours for one employee.
 * With no prior hourly payment, this is the selected month total.
 * After a payment, it is any unpaid remainder plus time worked after that payment.
 */
export async function hourlyUnpaidHoursForEmployee(owner, employeeId, periodMonth, now = new Date()) {
  const last = await EmployeePayrollPayment.findOne({
    createdByEmail: owner,
    employeeId,
    payType: "hourly",
  })
    .sort({ paidAt: -1, createdAt: -1 })
    .lean();

  if (!last?.paidAt) return monthHoursForEmployee(owner, employeeId, periodMonth, now);

  const after = new Date(last.paidAt);
  if (Number.isNaN(after.getTime())) return monthHoursForEmployee(owner, employeeId, periodMonth, now);

  const [punches, manuals] = await Promise.all([
    TimeClockPunch.find({
      createdByEmail: owner,
      employeeId,
      voidedAt: null,
      punchedAt: { $gte: new Date(after.getTime() - LOOKBACK_MS), $lte: now },
    })
      .sort({ punchedAt: 1 })
      .lean(),
    TimeClockManualHours.find({
      createdByEmail: owner,
      employeeId,
      voidedAt: null,
      workDate: { $gt: localDateIso(after) },
    }).lean(),
  ]);

  return round2(leftoverHours(last) + workedHoursAfter(punches, manuals, after, now));
}

/**
 * Unpaid hourly hours per employee.
 * Employees with a payment: remainder plus time after that payment.
 * Other employees with time in `periodMonth`: hours in that month through now, including an open shift.
 * @returns {Array<{ employeeId: string, unpaidHours: number, lastPayment: object|null }>}
 */
export async function hourlyUnpaidBalances(owner, now = new Date(), periodMonth = "") {
  const payments = await EmployeePayrollPayment.find({
    createdByEmail: owner,
    payType: "hourly",
  })
    .sort({ paidAt: 1, createdAt: 1 })
    .lean();

  const latest = new Map();
  for (const payment of payments) {
    const id = String(payment.employeeId || "").trim();
    if (!id || !payment.paidAt) continue;
    latest.set(id, payment);
  }

  const rows = [];
  if (latest.size) {
    let earliest = now.getTime();
    for (const payment of latest.values()) {
      const at = new Date(payment.paidAt).getTime();
      if (Number.isFinite(at) && at < earliest) earliest = at;
    }
    const employeeIds = [...latest.keys()];
    const lookback = new Date(earliest - LOOKBACK_MS);

    const [punches, manuals] = await Promise.all([
      TimeClockPunch.find({
        createdByEmail: owner,
        employeeId: { $in: employeeIds },
        voidedAt: null,
        punchedAt: { $gte: lookback, $lte: now },
      })
        .sort({ punchedAt: 1 })
        .lean(),
      TimeClockManualHours.find({
        createdByEmail: owner,
        employeeId: { $in: employeeIds },
        voidedAt: null,
        workDate: { $gt: localDateIso(lookback) },
      }).lean(),
    ]);

    const punchesByEmployee = new Map();
    for (const punch of punches) {
      const id = String(punch.employeeId);
      if (!punchesByEmployee.has(id)) punchesByEmployee.set(id, []);
      punchesByEmployee.get(id).push(punch);
    }
    const manualsByEmployee = new Map();
    for (const manual of manuals) {
      const id = String(manual.employeeId);
      if (!manualsByEmployee.has(id)) manualsByEmployee.set(id, []);
      manualsByEmployee.get(id).push(manual);
    }

    for (const employeeId of employeeIds) {
      const payment = latest.get(employeeId);
      const after = new Date(payment.paidAt);
      const unpaidHours = round2(
        leftoverHours(payment) +
          workedHoursAfter(
            punchesByEmployee.get(employeeId) || [],
            manualsByEmployee.get(employeeId) || [],
            after,
            now
          )
      );
      rows.push({ employeeId, unpaidHours, lastPayment: payment });
    }
  }

  const bounds = periodMonthBounds(periodMonth);
  if (!bounds) return rows;

  const monthStart = new Date(`${bounds.from}T00:00:00.000`);
  const untilDay = localDateIso(now);
  const toDay = untilDay && untilDay < bounds.to ? untilDay : bounds.to;
  const rangeEnd = new Date(`${bounds.to}T23:59:59.999`);
  const cap = now.getTime() < rangeEnd.getTime() ? now : rangeEnd;
  const covered = [...latest.keys()];
  const notCovered = covered.length ? { $nin: covered } : {};

  const [monthPunches, monthManuals] = await Promise.all([
    TimeClockPunch.find({
      createdByEmail: owner,
      voidedAt: null,
      punchedAt: { $gte: monthStart, $lte: cap },
      ...(covered.length ? { employeeId: notCovered } : {}),
    })
      .sort({ punchedAt: 1 })
      .lean(),
    TimeClockManualHours.find({
      createdByEmail: owner,
      voidedAt: null,
      workDate: { $gte: bounds.from, $lte: toDay },
      ...(covered.length ? { employeeId: notCovered } : {}),
    }).lean(),
  ]);

  const monthPunchMap = new Map();
  for (const punch of monthPunches) {
    const id = String(punch.employeeId || "");
    if (!id || latest.has(id)) continue;
    if (!monthPunchMap.has(id)) monthPunchMap.set(id, []);
    monthPunchMap.get(id).push(punch);
  }
  const monthManualMap = new Map();
  for (const manual of monthManuals) {
    const id = String(manual.employeeId || "");
    if (!id || latest.has(id)) continue;
    if (!monthManualMap.has(id)) monthManualMap.set(id, []);
    monthManualMap.get(id).push(manual);
  }

  const beforeMonth = new Date(monthStart.getTime() - 1);
  for (const employeeId of new Set([...monthPunchMap.keys(), ...monthManualMap.keys()])) {
    const unpaidHours = workedHoursAfter(
      monthPunchMap.get(employeeId) || [],
      monthManualMap.get(employeeId) || [],
      beforeMonth,
      cap
    );
    if (unpaidHours <= 0) continue;
    rows.push({ employeeId, unpaidHours, lastPayment: null });
  }

  return rows;
}
