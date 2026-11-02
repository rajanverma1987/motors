import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
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
    const parsed = parseInvoicePaymentBody(body);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectDB();
    const [doc, settingsDoc] = await Promise.all([
      Invoice.findOne({ _id: id, createdByEmail: email }),
      UserSettings.findOne({ ownerEmail: email }).lean(),
    ]);
    if (!doc) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const cust = await Customer.findOne({ _id: doc.customerId, createdByEmail: email }).lean();
    const merged = mergeUserSettings(settingsDoc?.settings);

    const balance = invoicePaymentBalance(doc, cust);
    if (parsed.amountNum > balance + 0.009) {
      return NextResponse.json(
        { error: `Amount exceeds open balance (${balance.toFixed(2)})` },
        { status: 400 }
      );
    }

    doc.payments = doc.payments || [];
    doc.payments.push({
      ...parsed.payment,
      recordedAt: new Date(),
    });
    doc.markModified("payments");
    syncInvoiceStatusFromPayments(doc, merged, cust);
    await doc.save();

    return NextResponse.json({
      ok: true,
      invoice: invoicePaymentResponse(doc, cust),
    });
  } catch (err) {
    console.error("Invoice payment POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
