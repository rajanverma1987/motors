import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";

function normalizeLines(body) {
  const scopeLines = Array.isArray(body.scopeLines)
    ? body.scopeLines.slice(0, 200).map((r) => ({
        scope: String(r?.scope ?? "").slice(0, 2000),
        price: String(r?.price ?? "").slice(0, 50),
      }))
    : [];
  const partsLines = Array.isArray(body.partsLines)
    ? body.partsLines.slice(0, 200).map((r) => ({
        item: String(r?.item ?? "").slice(0, 500),
        qty: String(r?.qty ?? "").slice(0, 50),
        uom: String(r?.uom ?? "").slice(0, 50),
        price: String(r?.price ?? "").slice(0, 50),
      }))
    : [];
  return { scopeLines, partsLines };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const list = await Invoice.find({ createdByEmail: email }).sort({ createdAt: -1 }).lean();
    const customerIds = [...new Set(list.map((i) => String(i.customerId)))];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      createdByEmail: email,
    })
      .lean()
      .catch(() => []);
    const custMap = Object.fromEntries(
      (customers || []).map((c) => [
        String(c._id),
        c.companyName || c.primaryContactName || String(c._id),
      ])
    );
    return NextResponse.json(
      list.map((inv) => ({
        id: inv._id.toString(),
        quoteId: inv.quoteId,
        invoiceNumber: inv.invoiceNumber,
        rfqNumber: inv.rfqNumber,
        date: inv.date,
        status: inv.status,
        customerId: inv.customerId,
        motorId: inv.motorId,
        customerName: custMap[String(inv.customerId)] || inv.customerId,
        createdAt: inv.createdAt,
      }))
    );
  } catch (err) {
    console.error("Invoices list:", err);
    return NextResponse.json({ error: err.message || "Failed to list" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const quoteId = String(body.quoteId || "").trim();
    if (!quoteId) {
      return NextResponse.json({ error: "quoteId required" }, { status: 400 });
    }
    await connectDB();
    const dup = await Invoice.findOne({ createdByEmail: email, quoteId }).lean();
    if (dup) {
      return NextResponse.json(
        { error: "An invoice already exists for this quote. Open it to edit.", existingId: dup._id.toString() },
        { status: 409 }
      );
    }
    const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email }).lean();
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    const { scopeLines, partsLines } = normalizeLines(body);
    const rfq = (quote.rfqNumber || "").trim() || String(quoteId).slice(-8);
    const doc = await Invoice.create({
      quoteId,
      customerId: String(quote.customerId || ""),
      motorId: String(quote.motorId || ""),
      invoiceNumber: rfq,
      rfqNumber: quote.rfqNumber || "",
      customerPo: String(body.customerPo ?? quote.customerPo ?? "").slice(0, 200),
      date: String(body.date ?? quote.date ?? "").slice(0, 50),
      preparedBy: String(body.preparedBy ?? "").slice(0, 200),
      scopeLines,
      partsLines,
      laborTotal: String(body.laborTotal ?? "").slice(0, 50),
      partsTotal: String(body.partsTotal ?? "").slice(0, 50),
      estimatedCompletion: String(body.estimatedCompletion ?? "").slice(0, 200),
      customerNotes: String(body.customerNotes ?? "").slice(0, 8000),
      notes: String(body.notes ?? "").slice(0, 8000),
      status: normalizeInvoiceStatusSlug(body.status),
      createdByEmail: email,
    });
    const o = doc.toObject();
    return NextResponse.json({ ok: true, invoice: { ...o, id: doc._id.toString(), _id: undefined } });
  } catch (err) {
    console.error("Invoice create:", err);
    if (err.code === 11000) {
      return NextResponse.json({ error: "Invoice already exists for this quote." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
