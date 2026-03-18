import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { resolvePreparedByDisplay } from "@/lib/prepared-by-display";
import { customerInvoiceToBlock } from "@/lib/customer-invoice-address";
import { invoiceBalance, invoiceLineTotal, invoiceTotalPaid } from "@/lib/invoice-amounts";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function normalizeLines(body) {
  const scopeLines = Array.isArray(body.scopeLines)
    ? body.scopeLines.slice(0, 200).map((r) => ({
        scope: String(r?.scope ?? "").slice(0, 2000),
        price: String(r?.price ?? "").slice(0, 50),
      }))
    : undefined;
  const partsLines = Array.isArray(body.partsLines)
    ? body.partsLines.slice(0, 200).map((r) => ({
        item: String(r?.item ?? "").slice(0, 500),
        qty: String(r?.qty ?? "").slice(0, 50),
        uom: String(r?.uom ?? "").slice(0, 50),
        price: String(r?.price ?? "").slice(0, 50),
      }))
    : undefined;
  return { scopeLines, partsLines };
}

async function loadInvoiceDoc(id, email) {
  await connectDB();
  return Invoice.findOne({ _id: id, createdByEmail: email }).lean();
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const email = user.email.trim().toLowerCase();
    const inv = await loadInvoiceDoc(id, email);
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [customer, motor] = await Promise.all([
      Customer.findOne({ _id: inv.customerId, createdByEmail: email }).lean(),
      Motor.findOne({ _id: inv.motorId, createdByEmail: email }).lean(),
    ]);
    const customerName = customer?.companyName || customer?.primaryContactName || inv.customerId;
    const { toName: customerToName, billingAddress: customerBillingAddress } =
      customerInvoiceToBlock(customer);
    const motorLabel =
      motor && [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ")
        ? [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ")
        : inv.motorId;
    const preparedByDisplay = await resolvePreparedByDisplay(inv.preparedBy, email);

    const owner = await User.findOne({ email }).lean();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const u = mergeUserSettings(settingsDoc?.settings);
    const fromShopName = (owner?.shopName || "").trim();
    const fromShopContact = [owner?.contactName, owner?.email].filter(Boolean).join(" · ") || "";

    const invTotal = invoiceLineTotal(inv);
    const invPaid = invoiceTotalPaid(inv);
    const invBal = invoiceBalance(inv);

    return NextResponse.json({
      ...inv,
      id: inv._id.toString(),
      _id: undefined,
      customerName,
      customerToName,
      customerBillingAddress,
      motorLabel,
      preparedByDisplay,
      fromShopName,
      fromShopContact,
      fromBillingAddress: (u.accountsBillingAddress || "").trim(),
      fromPaymentTermsLabel: accountsPaymentTermsLabel(u.accountsPaymentTerms),
      invoiceTotal: invTotal,
      amountPaid: invPaid,
      balance: invBal,
      payments: Array.isArray(inv.payments) ? inv.payments : [],
    });
  } catch (err) {
    console.error("Invoice GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const doc = await Invoice.findOne({ _id: id, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { scopeLines, partsLines } = normalizeLines(body);
    if (body.customerPo !== undefined) doc.customerPo = String(body.customerPo ?? "").slice(0, 200);
    if (body.date !== undefined) doc.date = String(body.date ?? "").slice(0, 50);
    if (body.preparedBy !== undefined) doc.preparedBy = String(body.preparedBy ?? "").slice(0, 200);
    if (body.laborTotal !== undefined) doc.laborTotal = String(body.laborTotal ?? "").slice(0, 50);
    if (body.partsTotal !== undefined) doc.partsTotal = String(body.partsTotal ?? "").slice(0, 50);
    if (body.estimatedCompletion !== undefined)
      doc.estimatedCompletion = String(body.estimatedCompletion ?? "").slice(0, 200);
    if (body.customerNotes !== undefined) doc.customerNotes = String(body.customerNotes ?? "").slice(0, 8000);
    if (body.notes !== undefined) doc.notes = String(body.notes ?? "").slice(0, 8000);
    if (body.status !== undefined) doc.status = normalizeInvoiceStatusSlug(body.status);
    if (scopeLines) doc.scopeLines = scopeLines;
    if (partsLines) doc.partsLines = partsLines;
    await doc.save();
    const o = doc.toObject();
    return NextResponse.json({ ok: true, invoice: { ...o, id: doc._id.toString(), _id: undefined } });
  } catch (err) {
    console.error("Invoice PATCH:", err);
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
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const r = await Invoice.deleteOne({ _id: id, createdByEmail: email });
    if (r.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Invoice DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
