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
