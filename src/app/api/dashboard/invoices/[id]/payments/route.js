import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { invoiceBalance, invoiceLineTotal, invoiceTotalPaid } from "@/lib/invoice-amounts";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

const METHODS = new Set(["cash", "check", "ach", "wire", "card", "other", ""]);

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const amount = parseFloat(String(body.amount ?? "").replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    const paymentDate = String(body.paymentDate ?? "").trim().slice(0, 50);
    if (!paymentDate) {
      return NextResponse.json({ error: "Payment date required" }, { status: 400 });
    }
    const method = String(body.method ?? "").trim().toLowerCase();
    if (!METHODS.has(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    const reference = String(body.reference ?? "").trim().slice(0, 200);
    const notes = String(body.notes ?? "").trim().slice(0, 2000);

    await connectDB();
    const doc = await Invoice.findOne({ _id: id, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const total = invoiceLineTotal(doc.toObject());
    const paidBefore = invoiceTotalPaid(doc.toObject());
    const balance = Math.max(0, Math.round((total - paidBefore) * 100) / 100);
    if (amount > balance + 0.009) {
      return NextResponse.json(
        { error: `Amount exceeds open balance (${balance.toFixed(2)})` },
        { status: 400 }
      );
    }

    doc.payments = doc.payments || [];
    doc.payments.push({
      amount: amount.toFixed(2),
      paymentDate,
      method: method || "other",
      reference,
      notes,
      recordedAt: new Date(),
    });

    const paidAfter = paidBefore + Math.round(amount * 100) / 100;
    const newBalance = Math.max(0, Math.round((total - paidAfter) * 100) / 100);
    if (newBalance <= 0.005) {
      doc.status = "fully_paid";
    } else if (paidAfter > 0) {
      doc.status = "partial_paid";
    }

    await doc.save();
    const o = doc.toObject();
    return NextResponse.json({
      ok: true,
      invoice: {
        id: doc._id.toString(),
        status: o.status,
        totalPaid: invoiceTotalPaid(o),
        balance: invoiceBalance(o),
        payments: o.payments || [],
      },
    });
  } catch (err) {
    console.error("Invoice payment POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
