import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import Customer from "@/models/Customer";
import Quote from "@/models/Quote";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { buildWorkOrderPdfBuffer } from "@/lib/work-order-pdf";
import { listInspectionsForWorkOrder } from "@/lib/work-order-inspections-list";
import { sendWorkOrderPdfToRecipient } from "@/lib/email";
import { LIMITS, clampString } from "@/lib/validation";

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

    const body = await request.json().catch(() => ({}));
    const toEmail = clampString(String(body.email ?? ""), LIMITS.email.max).trim().toLowerCase();
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    const instructions = clampString(String(body.instructions ?? ""), 4000).trim();

    await connectDB();
    const ownerEmail = user.email.trim().toLowerCase();
    const doc = await WorkOrder.findOne({ _id: id, createdByEmail: ownerEmail }).lean();
    if (!doc) return NextResponse.json({ error: "Work order not found" }, { status: 404 });

    const [customer, quote, technician] = await Promise.all([
      Customer.findOne({ _id: doc.customerId, createdByEmail: ownerEmail })
        .select({ companyName: 1, primaryContactName: 1, email: 1 })
        .lean(),
      Quote.findOne({ _id: doc.quoteId, createdByEmail: ownerEmail })
        .select({ scopeLines: 1, partsLines: 1 })
        .lean(),
      doc.technicianEmployeeId
        ? Employee.findOne({ _id: doc.technicianEmployeeId, createdByEmail: ownerEmail })
            .select({ name: 1 })
            .lean()
        : null,
    ]);

    const quoteScopeForTech = Array.isArray(quote?.scopeLines)
      ? quote.scopeLines
          .slice(0, 100)
          .map((row) => ({ scope: String(row?.scope ?? "").slice(0, 2000) }))
          .filter((r) => r.scope.trim())
      : [];
    const quoteOtherCostForTech = Array.isArray(quote?.partsLines)
      ? quote.partsLines
          .slice(0, 100)
          .map((row) => ({
            item: String(row?.item ?? "").slice(0, 500),
            qty: String(row?.qty ?? "1").slice(0, 50),
            uom: String(row?.uom ?? "").slice(0, 50),
          }))
          .filter((r) => r.item.trim())
      : [];

    const shopCompanyName =
      (user.shopName && String(user.shopName).trim()) ||
      process.env.MOTOR_SHOP_COMPANY_NAME?.trim() ||
      "";

    const inspections = await listInspectionsForWorkOrder(doc, ownerEmail);

    const pdfBuffer = await buildWorkOrderPdfBuffer({
      shopName: shopCompanyName,
      workOrderNumber: doc.workOrderNumber,
      date: doc.date,
      quoteRfqNumber: doc.quoteRfqNumber,
      customerCompany:
        customer?.companyName || customer?.primaryContactName || doc.companyName || "",
      technicianName: technician?.name || "",
      jobType: doc.jobType,
      status: doc.status,
      motorClass: doc.motorClass,
      notes: doc.notes,
      acSpecs: doc.acSpecs,
      dcSpecs: doc.dcSpecs,
      armatureSpecs: doc.armatureSpecs,
      quoteScopeForTech,
      quoteOtherCostForTech,
      inspections,
    });

    const result = await sendWorkOrderPdfToRecipient(
      toEmail,
      doc.workOrderNumber,
      shopCompanyName,
      pdfBuffer,
      { instructions }
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Email failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Work order sent by email." });
  } catch (err) {
    console.error("Work order send:", err);
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}
