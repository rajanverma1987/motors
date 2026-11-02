import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import SimpleExpense from "@/models/SimpleExpense";
import Employee from "@/models/Employee";
import { clampString } from "@/lib/validation";

function toNum(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function round2(v) {
  return Math.round((toNum(v) + Number.EPSILON) * 100) / 100;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function serialize(doc) {
  const o = doc?.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    expenseDate: String(o.expenseDate || "").slice(0, 10),
    category: String(o.category || "").trim(),
    creditCardNumber: String(o.creditCardNumber || "").trim(),
    employeeId: String(o.employeeId || "").trim(),
    employeeName: String(o.employeeName || "").trim(),
    amount: round2(o.amount),
    notes: String(o.notes || "").trim(),
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
  };
}

/**
 * GET /api/dashboard/simple-expenses?from=&to=&limit=
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const from = String(searchParams.get("from") || "").trim().slice(0, 10);
    const to = String(searchParams.get("to") || "").trim().slice(0, 10);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "200", 10) || 200, 1), 500);

    await connectDB();
    const filter = { createdByEmail: email };
    if (from || to) {
      filter.expenseDate = {};
      if (from) filter.expenseDate.$gte = from;
      if (to) filter.expenseDate.$lte = to;
    }

    const docs = await SimpleExpense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).limit(limit).lean();
    const rows = docs.map(serialize);
    const totalAmount = round2(rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
    return NextResponse.json({ ok: true, rows, summary: { count: rows.length, totalAmount } });
  } catch (err) {
    console.error("Simple expenses GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/simple-expenses
 */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));

    const expenseDate = clampString(body?.expenseDate || todayIso(), 10).trim().slice(0, 10);
    const category = clampString(body?.category, 80).trim();
    const creditCardNumber = clampString(body?.creditCardNumber, 80).trim();
    const employeeId = clampString(body?.employeeId, 64).trim();
    let employeeName = clampString(body?.employeeName, 120).trim();
    const notes = clampString(body?.notes, 500).trim();
    const amount = round2(body?.amount);

    if (!expenseDate) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount greater than zero." }, { status: 400 });
    }

    await connectDB();

    if (employeeId && !employeeName) {
      const emp = await Employee.findOne({ _id: employeeId, createdByEmail: email })
        .select({ name: 1 })
        .lean();
      employeeName = String(emp?.name || "").trim();
    }

    const doc = await SimpleExpense.create({
      expenseDate,
      category,
      creditCardNumber,
      employeeId,
      employeeName,
      amount,
      notes,
      createdByEmail: email,
    });

    return NextResponse.json({ ok: true, row: serialize(doc) }, { status: 201 });
  } catch (err) {
    console.error("Simple expenses POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
