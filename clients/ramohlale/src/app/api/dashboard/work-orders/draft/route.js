import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import Quote from "@/models/Quote";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import MotorRepairJob from "@/models/MotorRepairJob";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import { effectiveWorkOrderNumberPrefix } from "@/lib/document-number-prefixes";
import { quoteStatusAllowsWorkOrder } from "@/lib/quote-status-slug";
import { nextWorkOrderNumberSuggestion } from "@/lib/work-order-factory";
import {
  motorClassFromMotorType,
  specsFromMotorRecord,
  DEFAULT_WORK_ORDER_STATUSES,
} from "@/lib/work-order-fields";

function initialStatusFromSettings(settingsDoc) {
  const u = mergeUserSettings(settingsDoc?.settings);
  const list = u.workOrderStatuses?.length ? u.workOrderStatuses : DEFAULT_WORK_ORDER_STATUSES;
  if (list.includes("Assigned")) return "Assigned";
  return list[0] || "Assigned";
}

/**
 * Preview work order fields from quote — does not persist.
 * Actual creation happens in POST /api/dashboard/work-orders.
 */
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
    const quoteStatus = String(quote.status || "draft").trim();
    if (!quoteStatusAllowsWorkOrder(quoteStatus)) {
      return NextResponse.json(
        { error: "Quote must be approved before creating a work order" },
        { status: 400 }
      );
    }
    const motor = await Motor.findOne({
      _id: quote.motorId,
      createdByEmail: email,
    }).lean();
    if (!motor) {
      return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    }
    const customer = await Customer.findOne({
      _id: quote.customerId,
      createdByEmail: email,
    }).lean();
    const rfq = (quote.rfqNumber || "").trim() || "RFQ";
    let safeSegment = rfq.replace(/[^\w-]/g, "") || "RFQ";
    let repairFlowJobId = "";
    let repairJobNumber = "";
    const qJob = String(quote.repairFlowJobId || "").trim();
    if (qJob && mongoose.isValidObjectId(qJob)) {
      const rj = await MotorRepairJob.findOne({ _id: qJob, createdByEmail: email }).select("jobNumber").lean();
      if (rj?.jobNumber) {
        repairFlowJobId = qJob;
        repairJobNumber = String(rj.jobNumber).trim();
        safeSegment = repairJobNumber.replace(/[^\w-]/g, "") || safeSegment;
      }
    }
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const merged = mergeUserSettings(settingsDoc?.settings);
    const woHead = effectiveWorkOrderNumberPrefix(merged);
    const workOrderNumber = await nextWorkOrderNumberSuggestion(email, safeSegment, woHead);
    const motorClass = motorClassFromMotorType(motor.motorType);
    const today = new Date().toISOString().slice(0, 10);

    const { acSpecs, dcSpecs, armatureSpecs } = specsFromMotorRecord(motor, motorClass);

    const quoteScopeForTech = Array.isArray(quote.scopeLines)
      ? quote.scopeLines
          .slice(0, 100)
          .map((row) => ({ scope: String(row?.scope ?? "").slice(0, 2000) }))
          .filter((r) => r.scope.trim())
      : [];
    const quoteOtherCostForTech = Array.isArray(quote.partsLines)
      ? quote.partsLines
          .slice(0, 100)
          .map((row) => ({
            item: String(row?.item ?? "").slice(0, 500),
            qty: String(row?.qty ?? "1").slice(0, 50),
            uom: String(row?.uom ?? "").slice(0, 50),
          }))
          .filter((r) => r.item.trim())
      : [];

    const companyName = customer?.companyName || customer?.primaryContactName || "";

    return NextResponse.json({
      isDraft: true,
      draftQuoteId: quoteId,
      id: null,
      workOrderNumber,
      date: today,
      technicianEmployeeId: String(quote.technicianEmployeeId || "").trim(),
      jobType: "complete_motor",
      status: initialStatusFromSettings(settingsDoc),
      motorClass,
      quoteId,
      repairFlowJobId,
      repairJobNumber,
      motorId: String(motor._id),
      customerId: String(quote.customerId),
      companyName,
      customerCompany: companyName,
      quoteRfqNumber: rfq,
      quoteScopeForTech,
      quoteOtherCostForTech,
      acSpecs,
      dcSpecs,
      armatureSpecs,
    });
  } catch (err) {
    console.error("Work order draft:", err);
    return NextResponse.json({ error: err.message || "Failed to load draft" }, { status: 500 });
  }
}
