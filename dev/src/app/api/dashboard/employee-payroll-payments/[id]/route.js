import { NextResponse } from "next/server";
import path from "path";
import { connectDB } from "@/lib/db";
import EmployeePayrollPayment from "@/models/EmployeePayrollPayment";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { clampString } from "@/lib/validation";
import { MAX_DASHBOARD_ENTITY_ATTACHMENTS } from "@/lib/dashboard-entity-attachments";
import { saveEntityUploadFiles } from "@/lib/safe-buffer-upload";
import {
  employeePayrollPaymentToJson,
  isValidPeriodMonth,
  periodMonthBounds,
} from "@/lib/employee-payroll-payment";
import { hourlyUnpaidHoursForEmployee } from "@/lib/payroll-hour-balance";

const UPLOAD_DIR = "public/uploads/employee-payroll-payments";
const MAX_FILES = 20;
const MAX_SIZE_MB = 10;

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

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Payment id required" }, { status: 400 });

    await connectDB();
    const doc = await EmployeePayrollPayment.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(employeePayrollPaymentToJson(doc, { includeAttachments: true }));
  } catch (err) {
    console.error("Get employee payroll payment error:", err);
    return NextResponse.json({ error: "Failed to load payment" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Payment id required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const periodMonth = clampString(body?.periodMonth, 7);
    const paidAtInput = clampString(body?.paidAt, 50);
    const notes = clampString(body?.notes, 2000);
    const paymentMethod = clampString(body?.paymentMethod, 80);
    const hours = Number(body?.hours);
    const amount = Number(body?.amount);
    const periodFromInput = clampString(body?.periodFrom, 10);
    const periodToInput = clampString(body?.periodTo, 10);

    if (!isValidPeriodMonth(periodMonth)) {
      return NextResponse.json({ error: "Valid period month required (YYYY-MM)" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: "Mode of payment is required" }, { status: 400 });
    }
    if (!periodFromInput || !periodToInput || periodFromInput > periodToInput) {
      return NextResponse.json({ error: "Pay period dates are required" }, { status: 400 });
    }
    const paidAt = parsePaidAt(paidAtInput);
    if (!paidAt) return NextResponse.json({ error: "Paid date is required" }, { status: 400 });

    await connectDB();
    const doc = await EmployeePayrollPayment.findOne({ _id: id, createdByEmail: owner });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const payType = doc.payType === "salary" ? "salary" : "hourly";
    let hoursPaid = Number.isFinite(hours) && hours >= 0 ? hours : 0;
    let hoursDue = doc.hoursDue;
    if (payType === "salary") {
      hoursPaid = 0;
    } else {
      if (!Number.isFinite(hours) || hours <= 0) {
        return NextResponse.json({ error: "Enter the hours to pay." }, { status: 400 });
      }
      const unpaidHours = await hourlyUnpaidHoursForEmployee(owner, doc.employeeId, periodMonth, paidAt);
      const available = unpaidHours + (Number(doc.hours) || 0);
      if (hours > available + 0.001) {
        return NextResponse.json(
          { error: "Hours to pay cannot be more than the unpaid hours." },
          { status: 400 }
        );
      }
      hoursDue = available;
      hoursPaid = hours;
    }

    const bounds = periodMonthBounds(periodMonth);
    doc.periodMonth = periodMonth;
    doc.periodFrom = periodFromInput || bounds?.from || "";
    doc.periodTo = periodToInput || bounds?.to || "";
    doc.hours = hoursPaid;
    doc.hoursDue = hoursDue;
    doc.amount = amount;
    doc.paidAt = paidAt;
    doc.paymentMethod = paymentMethod;
    doc.notes = notes;
    await doc.save();

    return NextResponse.json({
      ok: true,
      payment: employeePayrollPaymentToJson(doc.toObject ? doc.toObject() : doc, {
        includeAttachments: true,
      }),
    });
  } catch (err) {
    console.error("Update employee payroll payment error:", err);
    return NextResponse.json({ error: err.message || "Failed to update payment" }, { status: 500 });
  }
}

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "employee-payroll-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Payment id required" }, { status: 400 });

    await connectDB();
    const doc = await EmployeePayrollPayment.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    const uploadResult = await saveEntityUploadFiles(files, {
      profile: "document",
      maxSizeMb: MAX_SIZE_MB,
      maxFiles: MAX_FILES,
      dir,
      buildUrl: (safeName) => `/uploads/employee-payroll-payments/${id}/${safeName}`,
    });
    if (!uploadResult.ok) {
      return NextResponse.json({ error: uploadResult.error }, { status: uploadResult.status || 400 });
    }

    const attachments = Array.isArray(doc.attachments) ? doc.attachments.map((a) => ({ ...a })) : [];
    attachments.push(...uploadResult.attachments);
    doc.attachments = attachments.slice(-MAX_DASHBOARD_ENTITY_ATTACHMENTS);
    doc.markModified("attachments");
    await doc.save();

    return NextResponse.json({
      ok: true,
      attachments: doc.attachments,
      payment: employeePayrollPaymentToJson(doc.toObject ? doc.toObject() : doc, {
        includeAttachments: true,
      }),
    });
  } catch (err) {
    console.error("Employee payroll payment upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
