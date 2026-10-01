import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import EmployeePayrollPayment from "@/models/EmployeePayrollPayment";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";
import {
  employeePayrollPaymentToJson,
  isValidPeriodMonth,
  periodMonthBounds,
} from "@/lib/employee-payroll-payment";
import {
  hourlyUnpaidBalances,
  hourlyUnpaidHoursForEmployee,
} from "@/lib/payroll-hour-balance";

let payrollIndexReady = null;

/** Older installs kept one payment per employee per month. That lock is gone. */
function ensurePayrollIndexes() {
  if (!payrollIndexReady) {
    payrollIndexReady = EmployeePayrollPayment.collection
      .dropIndex("unique_employee_payroll_month")
      .catch((err) => {
        const missing = err?.code === 27 || err?.codeName === "IndexNotFound";
        if (!missing) payrollIndexReady = null;
      });
  }
  return payrollIndexReady;
}

function parsePaidAt(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return Number.isNaN(end.getTime()) ? null : end;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** List payroll payments; filter by periodMonth and/or employeeId. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const { searchParams } = new URL(request.url);
    const periodMonth = clampString(searchParams.get("periodMonth") || searchParams.get("month"), 7);
    const employeeId = clampString(searchParams.get("employeeId"), 80);

    await connectDB();
    await ensurePayrollIndexes();

    if (searchParams.get("balances") === "1") {
      const rows = await hourlyUnpaidBalances(owner, new Date(), periodMonth);
      return NextResponse.json({
        balances: rows.map((row) => ({
          employeeId: row.employeeId,
          workedHours: row.workedHours,
          paidHours: row.paidHours,
          unpaidHours: row.unpaidHours,
          allUnpaidHours: row.allUnpaidHours,
          lastPayment: employeePayrollPaymentToJson(row.lastPayment),
        })),
      });
    }

    const where = { createdByEmail: owner };
    if (periodMonth) {
      if (!isValidPeriodMonth(periodMonth)) {
        return NextResponse.json({ error: "Invalid period month" }, { status: 400 });
      }
      where.periodMonth = periodMonth;
    }
    if (employeeId) {
      if (!mongoose.isValidObjectId(employeeId)) {
        return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
      }
      where.employeeId = employeeId;
    }

    const rows = await EmployeePayrollPayment.find(where).sort({ paidAt: -1, createdAt: -1 }).lean();
    return NextResponse.json({
      payments: rows.map((row) => employeePayrollPaymentToJson(row)),
    });
  } catch (err) {
    console.error("List employee payroll payments error:", err);
    return NextResponse.json({ error: "Failed to load payroll payments" }, { status: 500 });
  }
}

/** Record a payroll payment for one employee for one month. */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const body = await request.json().catch(() => ({}));
    const employeeId = clampString(body?.employeeId, 80);
    const periodMonth = clampString(body?.periodMonth, 7);
    const paidAtInput = clampString(body?.paidAt, 50);
    const notes = clampString(body?.notes, 2000);
    const paymentMethod = clampString(body?.paymentMethod, 80);
    const hours = Number(body?.hours);
    const amount = Number(body?.amount);
    const payType = String(body?.payType || "").toLowerCase() === "salary" ? "salary" : "hourly";
    const hourlyRate = clampString(body?.hourlyRate, 40);
    const periodFromInput = clampString(body?.periodFrom, 10);
    const periodToInput = clampString(body?.periodTo, 10);

    if (!mongoose.isValidObjectId(employeeId)) {
      return NextResponse.json({ error: "Valid employee id required" }, { status: 400 });
    }
    if (!isValidPeriodMonth(periodMonth)) {
      return NextResponse.json({ error: "Valid period month required (YYYY-MM)" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }
    if (!paidAtInput) {
      return NextResponse.json({ error: "Paid date is required" }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: "Mode of payment is required" }, { status: 400 });
    }
    if (!periodFromInput || !periodToInput) {
      return NextResponse.json({ error: "Pay period start and end dates are required" }, { status: 400 });
    }
    const periodFromDate = new Date(`${periodFromInput}T12:00:00.000Z`);
    const periodToDate = new Date(`${periodToInput}T12:00:00.000Z`);
    if (Number.isNaN(periodFromDate.getTime()) || Number.isNaN(periodToDate.getTime())) {
      return NextResponse.json({ error: "Invalid pay period dates" }, { status: 400 });
    }
    if (periodFromDate.getTime() > periodToDate.getTime()) {
      return NextResponse.json(
        { error: "Pay period start date must be on or before the end date" },
        { status: 400 }
      );
    }

    const bounds = periodMonthBounds(periodMonth);
    const paidAt = parsePaidAt(paidAtInput);
    if (!paidAt) {
      return NextResponse.json({ error: "Invalid paid date" }, { status: 400 });
    }

    await connectDB();
    await ensurePayrollIndexes();
    const employee = await Employee.findOne({ _id: employeeId, createdByEmail: owner }).lean();
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    let hoursDue = null;
    let hoursPaid = Number.isFinite(hours) && hours >= 0 ? hours : 0;
    if (payType === "salary") {
      const existing = await EmployeePayrollPayment.findOne({
        createdByEmail: owner,
        employeeId,
        periodMonth,
        payType: "salary",
      }).lean();
      if (existing) {
        return NextResponse.json(
          { error: "Salary for this employee and month is already recorded." },
          { status: 409 }
        );
      }
      hoursPaid = 0;
    } else {
      const unpaidHours = await hourlyUnpaidHoursForEmployee(owner, employeeId, periodMonth, paidAt);
      if (!Number.isFinite(hours) || hours <= 0) {
        return NextResponse.json({ error: "Enter the hours to pay." }, { status: 400 });
      }
      if (hours > unpaidHours + 0.001) {
        return NextResponse.json(
          { error: "Hours to pay cannot be more than the unpaid hours." },
          { status: 400 }
        );
      }
      hoursDue = unpaidHours;
      hoursPaid = hours;
    }

    const payload = {
      createdByEmail: owner,
      employeeId,
      employeeName: String(employee.name || "").trim(),
      employeeNumber: String(employee.employeeNumber || "").trim(),
      periodMonth,
      periodFrom: periodFromInput || bounds?.from || "",
      periodTo: periodToInput || bounds?.to || "",
      payType,
      hourlyRate: hourlyRate || String(employee.hourlyRate || "").trim(),
      hours: hoursPaid,
      hoursDue,
      amount,
      status: "paid",
      paidAt,
      paymentMethod,
      notes,
      attachments: [],
    };

    let doc;
    try {
      doc = await EmployeePayrollPayment.create(payload);
    } catch (err) {
      if (err?.code !== 11000) throw err;
      payrollIndexReady = null;
      await EmployeePayrollPayment.collection
        .dropIndex("unique_employee_payroll_month")
        .catch(() => {});
      doc = await EmployeePayrollPayment.create(payload);
    }

    return NextResponse.json({
      ok: true,
      payment: employeePayrollPaymentToJson(doc.toObject ? doc.toObject() : doc, {
        includeAttachments: true,
      }),
    });
  } catch (err) {
    console.error("Create employee payroll payment error:", err);
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 500 });
  }
}
