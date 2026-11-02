/**
 * Serialize EmployeePayrollPayment for dashboard JSON.
 * @param {object} doc
 * @param {{ includeAttachments?: boolean }} [opts]
 */
export function employeePayrollPaymentToJson(doc, { includeAttachments = false } = {}) {
  const row = doc && (doc.toObject ? doc.toObject() : doc);
  if (!row) return null;
  const attachments = Array.isArray(row.attachments)
    ? row.attachments.map((a) => ({
        url: String(a?.url ?? "").trim(),
        name: String(a?.name ?? "").trim(),
      }))
    : [];
  return {
    id: row._id?.toString(),
    employeeId: String(row.employeeId || "").trim(),
    employeeName: String(row.employeeName || "").trim(),
    employeeNumber: String(row.employeeNumber || "").trim(),
    periodMonth: String(row.periodMonth || "").trim(),
    periodFrom: String(row.periodFrom || "").trim(),
    periodTo: String(row.periodTo || "").trim(),
    payType: row.payType === "salary" ? "salary" : "hourly",
    hourlyRate: String(row.hourlyRate || "").trim(),
    hours: Number(row.hours) || 0,
    amount: Number(row.amount) || 0,
    status: "paid",
    paidAt: row.paidAt || null,
    paymentMethod: String(row.paymentMethod || "").trim(),
    notes: String(row.notes || "").trim(),
    attachmentCount: attachments.length,
    ...(includeAttachments ? { attachments } : {}),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

/** @param {string} ym */
export function isValidPeriodMonth(ym) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(ym || "").trim());
}

/**
 * @param {string} ym YYYY-MM
 * @returns {{ from: string, to: string }|null}
 */
export function periodMonthBounds(ym) {
  const match = String(ym || "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || m < 1 || m > 12) return null;
  const fromDate = new Date(y, m - 1, 1);
  const toDate = new Date(y, m, 0);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(fromDate), to: fmt(toDate) };
}

export function parsePayRate(value) {
  const n = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function inclusiveDayCount(from, to) {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

/**
 * Hours from one payment that belong to a month (or any YYYY-MM-DD range).
 * The whole payment counts when its pay period sits inside the range.
 * A period that crosses the range is split by the number of days in each side.
 */
export function paidHoursAppliedToRange(payment, rangeFrom, rangeTo) {
  const hours = Number(payment?.hours) || 0;
  if (hours <= 0) return 0;
  const fromRaw = String(rangeFrom || "").slice(0, 10);
  const toRaw = String(rangeTo || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) return 0;

  let periodFrom = String(payment?.periodFrom || "").slice(0, 10);
  let periodTo = String(payment?.periodTo || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) {
    const bounds = periodMonthBounds(payment?.periodMonth);
    if (!bounds) return 0;
    periodFrom = bounds.from;
    periodTo = bounds.to;
  }
  if (periodFrom > periodTo) return 0;

  const overlapFrom = periodFrom > fromRaw ? periodFrom : fromRaw;
  const overlapTo = periodTo < toRaw ? periodTo : toRaw;
  if (overlapFrom > overlapTo) return 0;
  if (overlapFrom === periodFrom && overlapTo === periodTo) {
    return Math.round((hours + Number.EPSILON) * 100) / 100;
  }

  const periodDays = inclusiveDayCount(periodFrom, periodTo);
  const overlapDays = inclusiveDayCount(overlapFrom, overlapTo);
  if (periodDays <= 0 || overlapDays <= 0) return 0;
  return Math.round((hours * (overlapDays / periodDays) + Number.EPSILON) * 100) / 100;
}

/**
 * Estimated pay for a period from hours + employee pay settings.
 * Hourly: hours × rate. Salary: rate field is treated as the period salary amount.
 */
export function estimateEmployeePeriodPay({ payType, hourlyRate, totalHours }) {
  const rate = parsePayRate(hourlyRate);
  const hours = Number(totalHours) || 0;
  if (String(payType || "").toLowerCase() === "salary") {
    return Math.round((rate + Number.EPSILON) * 100) / 100;
  }
  return Math.round((rate * hours + Number.EPSILON) * 100) / 100;
}
