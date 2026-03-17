import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";

/** GET ?token=xxx – return quote for display (public, no internal notes). Same shape as print. */
export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token || !token.trim()) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Quote.findOne({ respondToken: token.trim() }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Quote not found or link expired" }, { status: 404 });
    }
    let customerName = "";
    let motorLabel = "";
    if (doc.customerId) {
      const cust = await Customer.findById(doc.customerId).lean();
      if (cust) customerName = cust.primaryContactName?.trim() || cust.companyName?.trim() || "";
    }
    if (doc.motorId) {
      const motor = await Motor.findById(doc.motorId).lean();
      if (motor)
        motorLabel = [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ") || "";
    }
    const out = {
      id: doc._id.toString(),
      rfqNumber: doc.rfqNumber ?? "",
      customerId: doc.customerId ?? "",
      motorId: doc.motorId ?? "",
      customerName,
      motorLabel,
      customerPo: doc.customerPo ?? "",
      date: doc.date ?? "",
      preparedBy: doc.preparedBy ?? "",
      status: doc.status ?? "draft",
      scopeLines: Array.isArray(doc.scopeLines) ? doc.scopeLines : [],
      partsLines: Array.isArray(doc.partsLines) ? doc.partsLines : [],
      laborTotal: doc.laborTotal ?? "",
      partsTotal: doc.partsTotal ?? "",
      estimatedCompletion: doc.estimatedCompletion ?? "",
      customerNotes: doc.customerNotes ?? "",
      shop: { name: "", address: "", contact: "" },
      respondedAt:
        doc.respondedAt
          ? (doc.respondedAt.toISOString?.() ?? String(doc.respondedAt))
          : (doc.status === "approved" || doc.status === "rejected") && doc.updatedAt
            ? (doc.updatedAt.toISOString?.() ?? String(doc.updatedAt))
            : null,
    };
    return NextResponse.json(out);
  } catch (err) {
    console.error("Quote respond GET error:", err);
    return NextResponse.json({ error: "Failed to load quote" }, { status: 500 });
  }
}

/** POST { token, action: "approve" | "reject" } – update status (public). */
export async function POST(request) {
  try {
    const body = await request.json();
    const token = body?.token?.trim();
    const action = body?.action?.toLowerCase();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Action must be approve or reject" }, { status: 400 });
    }
    await connectDB();
    const doc = await Quote.findOne({ respondToken: token });
    if (!doc) {
      return NextResponse.json({ error: "Quote not found or link expired" }, { status: 404 });
    }
    const newStatus = action === "approve" ? "approved" : "rejected";
    const previousStatus = doc.status || "draft";
    if (previousStatus !== newStatus) {
      if (!Array.isArray(doc.statusLog)) doc.statusLog = [];
      doc.statusLog.push({
        from: previousStatus,
        to: newStatus,
        at: new Date(),
        by: "customer",
      });
      doc.markModified("statusLog");
    }
    doc.status = newStatus;
    doc.respondedAt = new Date();
    await doc.save();
    return NextResponse.json({
      ok: true,
      status: doc.status,
      message: action === "approve" ? "Quote approved. Thank you!" : "Quote declined. Thank you for letting us know.",
    });
  } catch (err) {
    console.error("Quote respond POST error:", err);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}
