import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import Quote from "@/models/Quote";
import { loadWriteUpQuoteForTechnician } from "@/lib/tech-job-queries";
import {
  INSPECTION_DONE_QUOTE_STATUS,
  isInspectionDoneStatus,
  isWriteUpStatus,
} from "@/lib/quote-rfq-lifecycle";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const quoteId = decodeURIComponent(String(params?.quoteId || "").trim());
    if (!quoteId) {
      return NextResponse.json({ error: "Quote id required" }, { status: 400 });
    }

    await connectDB();
    const ctx = await loadWriteUpQuoteForTechnician(tech, quoteId);
    if (!ctx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const doc = await Quote.findOne({
      _id: quoteId,
      createdByEmail: tech.shopEmail.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (isInspectionDoneStatus(doc.status)) {
      return NextResponse.json({
        ok: true,
        quote: { id: doc._id.toString(), status: doc.status },
      });
    }

    if (!isWriteUpStatus(doc.status)) {
      return NextResponse.json(
        { error: "RFQ must be in Write-Up to complete pre-inspection" },
        { status: 400 }
      );
    }

    const prevStatus = String(doc.status || "").trim() || "write-up";
    if (!Array.isArray(doc.statusLog)) doc.statusLog = [];
    doc.statusLog.push({
      from: prevStatus,
      to: INSPECTION_DONE_QUOTE_STATUS,
      at: new Date(),
      by: tech.name || tech.employeeEmail || "Technician",
    });
    doc.markModified("statusLog");
    doc.status = INSPECTION_DONE_QUOTE_STATUS;
    await doc.save();

    return NextResponse.json({
      ok: true,
      quote: { id: doc._id.toString(), status: doc.status },
    });
  } catch (err) {
    console.error("Tech pre-inspection complete:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
