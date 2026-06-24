import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Quote from "@/models/Quote";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeDashboardQuoteStatusSlug } from "@/lib/quote-status-slug";
import { CONVERT_TO_RFQ_QUOTE_STATUS } from "@/lib/quote-rfq-lifecycle";
import { quoteToDashboardJson } from "@/lib/quote-api-response";

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
    await connectDB();

    const inv = await Invoice.findOne({ _id: id, createdByEmail: email });
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const quoteId = String(inv.quoteId || "").trim();
    if (!quoteId) {
      return NextResponse.json({ error: "Invoice is not linked to an RFQ." }, { status: 400 });
    }

    const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email });
    if (!quote) return NextResponse.json({ error: "Linked RFQ not found" }, { status: 404 });

    const nextStatus = normalizeDashboardQuoteStatusSlug(CONVERT_TO_RFQ_QUOTE_STATUS);
    const prevStatus = String(quote.status || "draft").trim() || "draft";
    if (nextStatus !== prevStatus) {
      if (!Array.isArray(quote.statusLog)) quote.statusLog = [];
      quote.statusLog.push({
        from: prevStatus,
        to: nextStatus,
        at: new Date(),
        by:
          (user.contactName && user.contactName.trim()) ||
          (user.shopName && user.shopName.trim()) ||
          user.email?.trim() ||
          "",
      });
      quote.markModified("statusLog");
      quote.status = nextStatus;
      await quote.save();
    }

    const deleted = await Invoice.deleteOne({ _id: id, createdByEmail: email });
    if (deleted.deletedCount === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      quoteId,
      quote: quoteToDashboardJson(quote),
    });
  } catch (err) {
    console.error("Invoice convert-to-rfq:", err);
    return NextResponse.json({ error: err.message || "Failed to convert" }, { status: 500 });
  }
}
