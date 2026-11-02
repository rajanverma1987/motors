import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString, LIMITS } from "@/lib/validation";
import { poBalanceDue, sumVendorInvoiced, sumVendorPayments } from "@/lib/po-payable";

const MAX_PAYMENTS = 50;

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
    const reference = clampString(body.reference, 200);
    const notes = clampString(body.notes, 2000);

    await connectDB();
    const doc = await PurchaseOrder.findOne({ _id: id, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

    const pays = Array.isArray(doc.payments) ? doc.payments : [];
    if (pays.length >= MAX_PAYMENTS) {
      return NextResponse.json({ error: "Maximum payments reached for this PO" }, { status: 400 });
    }

    const balance = poBalanceDue(doc.toObject());
    if (amount > balance + 0.009) {
      return NextResponse.json(
        { error: `Amount exceeds balance due on vendor invoices (${balance.toFixed(2)})` },
        { status: 400 }
      );
    }
    if (balance <= 0.005) {
      return NextResponse.json({ error: "No balance due on this PO" }, { status: 400 });
    }

    doc.payments = pays;
    doc.payments.push({
      amount: amount.toFixed(2),
      date: paymentDate,
      method: method || "other",
      reference,
      notes,
      recordedAt: new Date(),
    });
    await doc.save();

    const o = doc.toObject();
    const invoiced = sumVendorInvoiced(o);
    const paid = sumVendorPayments(o);
    return NextResponse.json({
      ok: true,
      totalInvoiced: invoiced,
      totalPaid: paid,
      balanceDue: poBalanceDue(o),
      paymentCount: (doc.payments || []).length,
    });
  } catch (err) {
    console.error("Vendor payment POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
