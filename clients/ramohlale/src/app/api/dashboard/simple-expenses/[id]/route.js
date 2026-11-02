import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import SimpleExpense from "@/models/SimpleExpense";
import Employee from "@/models/Employee";
import { clampString } from "@/lib/validation";
import mongoose from "mongoose";

function toNum(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function round2(v) {
  return Math.round((toNum(v) + Number.EPSILON) * 100) / 100;
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * PATCH /api/dashboard/simple-expenses/[id]
 */
export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const params = typeof context?.params?.then === "function" ? await context.params : context?.params;
    const id = String(params?.id || "").trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    await connectDB();
    const doc = await SimpleExpense.findOne({ _id: id, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.expenseDate !== undefined) {
      const expenseDate = clampString(body.expenseDate || todayIso(), 10).trim().slice(0, 10);
      if (!expenseDate) return NextResponse.json({ error: "Date is required." }, { status: 400 });
      doc.expenseDate = expenseDate;
    }
    if (body.category !== undefined) {
      const category = clampString(body.category, 80).trim();
      if (!category) return NextResponse.json({ error: "Category is required." }, { status: 400 });
      doc.category = category;
    }
    if (body.creditCardNumber !== undefined) {
      doc.creditCardNumber = clampString(body.creditCardNumber, 80).trim();
    }
    if (body.amount !== undefined) {
      const amount = round2(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Enter a valid amount greater than zero." }, { status: 400 });
      }
      doc.amount = amount;
    }
    if (body.notes !== undefined) doc.notes = clampString(body.notes, 500).trim();
    if (body.employeeId !== undefined) {
      const employeeId = clampString(body.employeeId, 64).trim();
      doc.employeeId = employeeId;
      let employeeName = clampString(body.employeeName, 120).trim();
      if (employeeId && !employeeName) {
        const emp = await Employee.findOne({ _id: employeeId, createdByEmail: email })
          .select({ name: 1 })
          .lean();
        employeeName = String(emp?.name || "").trim();
      }
      doc.employeeName = employeeName;
    } else if (body.employeeName !== undefined) {
      doc.employeeName = clampString(body.employeeName, 120).trim();
    }

    await doc.save();
    return NextResponse.json({ ok: true, row: serialize(doc) });
  } catch (err) {
    console.error("Simple expenses PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

/**
 * DELETE /api/dashboard/simple-expenses/[id]
 */
export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const params = typeof context?.params?.then === "function" ? await context.params : context?.params;
    const id = String(params?.id || "").trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await SimpleExpense.findOneAndDelete({ _id: id, createdByEmail: email });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Simple expenses DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
