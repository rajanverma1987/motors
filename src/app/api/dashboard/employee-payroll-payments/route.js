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
    const hours = Number(body?.hours);
    const amount = Number(body?.amount);
    const payType = String(body?.payType || "").toLowerCase() === "salary" ? "salary" : "hourly";
    const hourlyRate = clampString(body?.hourlyRate, 40);

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

    const bounds = periodMonthBounds(periodMonth);
    const paidAt = new Date(`${paidAtInput}T12:00:00.000Z`);
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: "Invalid paid date" }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOne({ _id: employeeId, createdByEmail: owner }).lean();
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const existing = await EmployeePayrollPayment.findOne({
      createdByEmail: owner,
      employeeId,
      periodMonth,
    }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "Payroll for this employee and month is already recorded." },
        { status: 409 }
      );
    }

    const doc = await EmployeePayrollPayment.create({
      createdByEmail: owner,
      employeeId,
      employeeName: String(employee.name || "").trim(),
      employeeNumber: String(employee.employeeNumber || "").trim(),
      periodMonth,
      periodFrom: bounds?.from || "",
      periodTo: bounds?.to || "",
      payType,
      hourlyRate: hourlyRate || String(employee.hourlyRate || "").trim(),
      hours: Number.isFinite(hours) && hours >= 0 ? hours : 0,
      amount,
      status: "paid",
      paidAt,
      notes,
      attachments: [],
    });

    return NextResponse.json({
      ok: true,
      payment: employeePayrollPaymentToJson(doc.toObject ? doc.toObject() : doc, {
        includeAttachments: true,
      }),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "Payroll for this employee and month is already recorded." },
        { status: 409 }
      );
    }
    console.error("Create employee payroll payment error:", err);
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 500 });
  }
}
