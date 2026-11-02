import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { invoiceTotalPaid } from "@/lib/invoice-amounts";
import {
  invoicePaymentBalance,
  invoicePaymentResponse,
  parseInvoicePaymentBody,
  syncInvoiceStatusFromPayments,
} from "@/lib/invoice-payment-records";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function parsePaymentIndex(raw) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

async function loadInvoicePaymentContext(id, email) {
  await connectDB();
  const [doc, settingsDoc] = await Promise.all([
    Invoice.findOne({ _id: id, createdByEmail: email }),
    UserSettings.findOne({ ownerEmail: email }).lean(),
  ]);
  if (!doc) return null;
  const customer = await Customer.findOne({ _id: doc.customerId, createdByEmail: email }).lean();
  const merged = mergeUserSettings(settingsDoc?.settings);
  return { doc, customer, merged };
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    const index = parsePaymentIndex(params?.index);
    if (!id || index == null) {
      return NextResponse.json({ error: "ID and payment index required" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const parsed = parseInvoicePaymentBody(body);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const ctx = await loadInvoicePaymentContext(id, email);
    if (!ctx) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const { doc, customer, merged } = ctx;
    const payments = Array.isArray(doc.payments) ? doc.payments : [];
    if (index >= payments.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paidWithout = invoiceTotalPaid({
      ...doc.toObject(),
      payments: payments.filter((_, i) => i !== index),
    });
    const maxAllowed = Math.round((paidWithout + invoicePaymentBalance(doc, customer)) * 100) / 100;
    if (parsed.amountNum > maxAllowed + 0.009) {
      return NextResponse.json(
        { error: `Amount exceeds open balance (${maxAllowed.toFixed(2)})` },
        { status: 400 }
      );
    }

    const existing = payments[index].toObject ? payments[index].toObject() : { ...payments[index] };
    payments[index] = {
      ...existing,
      ...parsed.payment,
      recordedAt: existing.recordedAt || new Date(),
    };
    doc.payments = payments;
    doc.markModified("payments");
    syncInvoiceStatusFromPayments(doc, merged, customer);
    await doc.save();

    return NextResponse.json({ ok: true, invoice: invoicePaymentResponse(doc, customer) });
  } catch (err) {
    console.error("Invoice payment PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    const index = parsePaymentIndex(params?.index);
    if (!id || index == null) {
      return NextResponse.json({ error: "ID and payment index required" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();

    const ctx = await loadInvoicePaymentContext(id, email);
    if (!ctx) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const { doc, customer, merged } = ctx;
    const payments = Array.isArray(doc.payments) ? [...doc.payments] : [];
    if (index >= payments.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    payments.splice(index, 1);
    doc.payments = payments;
    doc.markModified("payments");
    syncInvoiceStatusFromPayments(doc, merged, customer);
    await doc.save();

    return NextResponse.json({ ok: true, invoice: invoicePaymentResponse(doc, customer) });
  } catch (err) {
    console.error("Invoice payment DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
