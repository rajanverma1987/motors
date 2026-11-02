import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import WorkOrder from "@/models/WorkOrder";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { nextInvoiceNumberForQuote } from "@/lib/job-document-numbers";
import { resolveInvoiceTaxFields } from "@/lib/quote-invoice-totals";

/** Draft invoice from quote — does not persist; suggests next invoice number (CEMR-A00001-1, -2, …). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const quoteId = String(searchParams.get("quoteId") || "").trim();
    if (!quoteId) {
      return NextResponse.json({ error: "quoteId required" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();

    const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email }).lean();
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    const motor = await Motor.findOne({ _id: quote.motorId, createdByEmail: email }).lean();
    const customer = await Customer.findOne({ _id: quote.customerId, createdByEmail: email }).lean();
    if (!motor || !customer) {
      return NextResponse.json({ error: "Motor or customer not found" }, { status: 404 });
    }

    const baseJob = (quote.rfqNumber || "").trim() || String(quoteId).slice(-8);
    const invoiceNumber = await nextInvoiceNumberForQuote(email, quoteId, baseJob);
    const today = new Date().toISOString().slice(0, 10);
    const companyName = customer.companyName || customer.primaryContactName || "";
    const motorLabel =
      [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ") || String(motor._id);

    const wo = await WorkOrder.findOne({ createdByEmail: email, quoteId })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();
    const workOrderId = wo?._id?.toString() ?? null;
    const tax = resolveInvoiceTaxFields({ customer, quote });

    return NextResponse.json({
      isDraft: true,
      draftQuoteId: quoteId,
      quoteId,
      workOrderId,
      customerId: String(quote.customerId),
      motorId: String(quote.motorId),
      invoiceNumber,
      rfqNumber: quote.rfqNumber || "",
      customerPo: quote.customerPo || "",
      date: quote.date || today,
      preparedBy: quote.preparedBy || "",
      scopeLines: Array.isArray(quote.scopeLines) ? quote.scopeLines.map((r) => ({ ...r })) : [],
      partsLines: Array.isArray(quote.partsLines) ? quote.partsLines.map((r) => ({ ...r })) : [],
      laborTotal: quote.laborTotal || "",
      partsTotal: quote.partsTotal || "",
      customerTaxExempt: tax.customerTaxExempt,
      customerTaxPercent: tax.customerTaxPercent,
      customerNotes: quote.customerNotes || "",
      notes: quote.notes || "",
      status: "draft",
      customerName: companyName,
      motorLabel,
    });
  } catch (err) {
    console.error("Invoice draft:", err);
    return NextResponse.json({ error: err.message || "Failed to load draft" }, { status: 500 });
  }
}
