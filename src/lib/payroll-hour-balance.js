import Employee from "@/models/Employee";
import EmployeePayrollPayment from "@/models/EmployeePayrollPayment";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import TimeClockPunch from "@/models/TimeClockPunch";
import { paidHoursAppliedToRange, parsePayRate, periodMonthBounds } from "@/lib/employee-payroll-payment";
import { localDateIso, workedHoursAfter } from "@/lib/time-clock-punches";

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * All clocked and manual hours through `until`, for every period.
 * An open shift counts up to `until`.
 */
async function lifetimeWorkedByEmployee(owner, until, employeeId) {
  const day = localDateIso(until);
  const punchQuery = {
    createdByEmail: owner,
    voidedAt: null,
    punchedAt: { $lte: until },
  };
  const manualQuery = {
    createdByEmail: owner,
    voidedAt: null,
    ...(day ? { workDate: { $lte: day } } : {}),
  };
  if (employeeId) {
    punchQuery.employeeId = employeeId;
    manualQuery.employeeId = employeeId;
  }

  const [punches, manuals] = await Promise.all([
    TimeClockPunch.find(punchQuery).sort({ punchedAt: 1 }).lean(),
    TimeClockManualHours.find(manualQuery).lean(),
  ]);

  const punchesByEmployee = new Map();
  for (const punch of punches) {
    const id = String(punch.employeeId || "");
    if (!id) continue;
    if (!punchesByEmployee.has(id)) punchesByEmployee.set(id, []);
    punchesByEmployee.get(id).push(punch);
  }
  const manualsByEmployee = new Map();
  for (const manual of manuals) {
    const id = String(manual.employeeId || "");
    if (!id) continue;
    if (!manualsByEmployee.has(id)) manualsByEmployee.set(id, []);
    manualsByEmployee.get(id).push(manual);
  }

  const hoursByEmployee = new Map();
  for (const id of new Set([...punchesByEmployee.keys(), ...manualsByEmployee.keys()])) {
    hoursByEmployee.set(
      id,
      workedHoursAfter(
        punchesByEmployee.get(id) || [],
        manualsByEmployee.get(id) || [],
        new Date(0),
        until
      )
    );
  }
  return hoursByEmployee;
}

function lifetimePaidByEmployee(payments) {
  const paidByEmployee = new Map();
  const latestByEmployee = new Map();
  for (const payment of payments) {
    const id = String(payment.employeeId || "").trim();
    if (!id || payment.payType === "salary") continue;
    const hours = Number(payment.hours) || 0;
    if (hours > 0) paidByEmployee.set(id, round2((paidByEmployee.get(id) || 0) + hours));
    const prev = latestByEmployee.get(id);
    const at = new Date(payment.paidAt || 0).getTime();
    const prevAt = prev ? new Date(prev.paidAt || 0).getTime() : -1;
    if (!prev || at >= prevAt) latestByEmployee.set(id, payment);
  }
  return { paidByEmployee, latestByEmployee };
}

/**
 * All unpaid hourly hours for one employee.
 * Hours worked in every period through `now`, minus hours already paid.
 */
export async function hourlyUnpaidHoursForEmployee(owner, employeeId, _periodMonth, now = new Date()) {
  const until = now instanceof Date ? now : new Date(now);
  const [workedByEmployee, payments] = await Promise.all([
    lifetimeWorkedByEmployee(owner, until, employeeId),
    EmployeePayrollPayment.find({
      createdByEmail: owner,
      employeeId,
      payType: "hourly",
    }).lean(),
  ]);
  const worked = workedByEmployee.get(String(employeeId)) || 0;
  const { paidByEmployee } = lifetimePaidByEmployee(payments);
  const paid = paidByEmployee.get(String(employeeId)) || 0;
  return Math.max(0, round2(worked - paid));
}

function monthWindow(periodMonth, now) {
  const ym =
    String(periodMonth || "").trim() || String(localDateIso(now) || "").slice(0, 7);
  const bounds = periodMonthBounds(ym);
  if (!bounds) return null;
  const [y, m, d] = bounds.from.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const [ty, tm, td] = bounds.to.split("-").map(Number);
  const monthEnd = new Date(ty, tm - 1, td, 23, 59, 59, 999);
  const until = now.getTime() < monthEnd.getTime() ? now : monthEnd;
  let manualTo = localDateIso(until);
  if (!manualTo || manualTo > bounds.to) manualTo = bounds.to;
  if (manualTo < bounds.from) manualTo = bounds.from;
  return {
    from: bounds.from,
    to: bounds.to,
    manualTo,
    after: new Date(start.getTime() - 1),
    until: until.getTime() < start.getTime() ? new Date(start.getTime() - 1) : until,
    lookback: new Date(start.getTime() - LOOKBACK_MS),
  };
}

async function monthWorkedByEmployee(owner, window) {
  const [punches, manuals] = await Promise.all([
    TimeClockPunch.find({
      createdByEmail: owner,
      voidedAt: null,
      punchedAt: { $gte: window.lookback, $lte: window.until },
    })
      .sort({ punchedAt: 1 })
      .lean(),
    TimeClockManualHours.find({
      createdByEmail: owner,
      voidedAt: null,
      workDate: { $gte: window.from, $lte: window.manualTo },
    }).lean(),
  ]);

  const punchesByEmployee = new Map();
  for (const punch of punches) {
    const id = String(punch.employeeId || "");
    if (!id) continue;
    if (!punchesByEmployee.has(id)) punchesByEmployee.set(id, []);
    punchesByEmployee.get(id).push(punch);
  }
  const manualsByEmployee = new Map();
  for (const manual of manuals) {
    const id = String(manual.employeeId || "");
    if (!id) continue;
    if (!manualsByEmployee.has(id)) manualsByEmployee.set(id, []);
    manualsByEmployee.get(id).push(manual);
  }

  const hoursByEmployee = new Map();
  for (const id of new Set([...punchesByEmployee.keys(), ...manualsByEmployee.keys()])) {
    hoursByEmployee.set(
      id,
      workedHoursAfter(
        punchesByEmployee.get(id) || [],
        manualsByEmployee.get(id) || [],
        window.after,
        window.until
      )
    );
  }
  return hoursByEmployee;
}

/**
 * Hour rows for the selected month, plus all unpaid hours for the Pay form.
 * workedHours, paidHours, and unpaidHours are the selected month only.
 * allUnpaidHours is every period through now, minus hours already paid.
 * @returns {Array<{ employeeId: string, workedHours: number, paidHours: number, unpaidHours: number, allUnpaidHours: number, lastPayment: object|null }>}
 */
export async function hourlyUnpaidBalances(owner, now = new Date(), periodMonth) {
  const until = now instanceof Date ? now : new Date(now);
  const window = monthWindow(periodMonth, until);
  if (!window) return [];

  const [monthWorked, lifetimeWorked, payments] = await Promise.all([
    monthWorkedByEmployee(owner, window),
    lifetimeWorkedByEmployee(owner, until),
    EmployeePayrollPayment.find({
      createdByEmail: owner,
      payType: "hourly",
    })
      .sort({ paidAt: 1, createdAt: 1 })
      .lean(),
  ]);
  const { paidByEmployee } = lifetimePaidByEmployee(payments);

  const monthPaid = new Map();
  const monthLatest = new Map();
  for (const payment of payments) {
    const id = String(payment.employeeId || "").trim();
    if (!id || payment.payType === "salary") continue;
    const applied = paidHoursAppliedToRange(payment, window.from, window.to);
    if (applied <= 0) continue;
    monthPaid.set(id, round2((monthPaid.get(id) || 0) + applied));
    const prev = monthLatest.get(id);
    const at = new Date(payment.paidAt || 0).getTime();
    const prevAt = prev ? new Date(prev.paidAt || 0).getTime() : -1;
    if (!prev || at >= prevAt) monthLatest.set(id, payment);
  }

  const ids = new Set([...monthWorked.keys(), ...monthPaid.keys()]);
  const rows = [];
  for (const employeeId of ids) {
    const worked = monthWorked.get(employeeId) || 0;
    const paid = monthPaid.get(employeeId) || 0;
    const unpaidHours = Math.max(0, round2(worked - paid));
    const allUnpaidHours = Math.max(
      0,
      round2((lifetimeWorked.get(employeeId) || 0) - (paidByEmployee.get(employeeId) || 0))
    );
    const lastPayment = monthLatest.get(employeeId) || null;
    if (unpaidHours <= 0 && !lastPayment) continue;
    rows.push({
      employeeId,
      workedHours: round2(worked),
      paidHours: round2(paid),
      unpaidHours,
      allUnpaidHours,
      lastPayment,
    });
  }
  return rows;
}

/**
 * Inactive employees whose pay is fully recorded.
 * They stay off Floor, Hours, Punches, and Alerts.
 * An inactive employee with unpaid hours or an unpaid salary month stays visible.
 * @returns {Promise<Set<string>>}
 */
export async function settledInactiveEmployeeIds(owner, now = new Date()) {
  const inactive = await Employee.find({
    createdByEmail: owner,
    employmentStatus: "Inactive",
  })
    .select("payType hourlyRate inactiveDate")
    .lean();
  if (!inactive.length) return new Set();

  const ids = inactive.map((emp) => String(emp._id));
  const [punches, manuals, payments] = await Promise.all([
    TimeClockPunch.find({
      createdByEmail: owner,
      employeeId: { $in: ids },
      voidedAt: null,
    })
      .sort({ punchedAt: 1 })
      .lean(),
    TimeClockManualHours.find({
      createdByEmail: owner,
      employeeId: { $in: ids },
      voidedAt: null,
    }).lean(),
    EmployeePayrollPayment.find({
      createdByEmail: owner,
      employeeId: { $in: ids },
    }).lean(),
  ]);

  const punchesByEmployee = new Map();
  for (const punch of punches) {
    const id = String(punch.employeeId || "");
    if (!punchesByEmployee.has(id)) punchesByEmployee.set(id, []);
    punchesByEmployee.get(id).push(punch);
  }
  const manualsByEmployee = new Map();
  for (const manual of manuals) {
    const id = String(manual.employeeId || "");
    if (!manualsByEmployee.has(id)) manualsByEmployee.set(id, []);
    manualsByEmployee.get(id).push(manual);
  }
  const paymentsByEmployee = new Map();
  for (const payment of payments) {
    const id = String(payment.employeeId || "");
    if (!paymentsByEmployee.has(id)) paymentsByEmployee.set(id, []);
    paymentsByEmployee.get(id).push(payment);
  }

  const settled = new Set();
  const todayMonth = localDateIso(now).slice(0, 7);
  for (const emp of inactive) {
    const id = String(emp._id);
    const payType = String(emp.payType || "").toLowerCase() === "salary" ? "salary" : "hourly";
    const empPayments = paymentsByEmployee.get(id) || [];
    if (payType === "salary") {
      const rate = parsePayRate(emp.hourlyRate);
      const month = String(emp.inactiveDate || "").slice(0, 7) || todayMonth;
      const salaryPaid = empPayments.some(
        (payment) =>
          payment.payType === "salary" &&
          String(payment.periodMonth || "") === month &&
          Number(payment.amount) > 0
      );
      if (rate <= 0 || salaryPaid) settled.add(id);
      continue;
    }
    const paid = empPayments
      .filter((payment) => payment.payType !== "salary")
      .reduce((sum, payment) => sum + (Number(payment.hours) || 0), 0);
    const worked = workedHoursAfter(
      punchesByEmployee.get(id) || [],
      manualsByEmployee.get(id) || [],
      new Date(0),
      now
    );
    if (worked - paid <= 0.001) settled.add(id);
  }
  return settled;
}
