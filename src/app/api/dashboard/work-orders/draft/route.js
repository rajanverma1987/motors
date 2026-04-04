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
import {
  motorClassFromMotorType,
  prefillSpecsFromMotor,
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  DEFAULT_WORK_ORDER_STATUSES,
} from "@/lib/work-order-fields";

function initialStatusFromSettings(settingsDoc) {
  const u = mergeUserSettings(settingsDoc?.settings);
  const list = u.workOrderStatuses?.length ? u.workOrderStatuses : DEFAULT_WORK_ORDER_STATUSES;
  if (list.includes("Assigned")) return "Assigned";
  return list[0] || "Assigned";
}

/**
 * Suggest the next work order number for this account + Job#/RFQ slug.
 * Purely read-only; actual creation happens in POST /api/dashboard/work-orders.
 */
async function suggestWorkOrderNumber(email, safeSegment) {
  const prefix = `W-${safeSegment}-`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const latest = await WorkOrder.findOne({
    createdByEmail: email,
    workOrderNumber: { $regex: `^${escaped}\\d+$` },
  })
    .sort({ createdAt: -1, workOrderNumber: -1 })
    .lean();

  let next = 1;
  if (latest?.workOrderNumber) {
    const parts = String(latest.workOrderNumber).split("-");
    const suffixRaw = parts[parts.length - 1];
    const parsed = Number.parseInt(suffixRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) next = parsed + 1;
  }
  return `${prefix}${next}`;
}

/** Preview work order fields from quote — does not persist. */
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
    const workOrderNumber = await suggestWorkOrderNumber(email, safeSegment);
    const motorClass = motorClassFromMotorType(motor.motorType);
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const today = new Date().toISOString().slice(0, 10);

    const acSpecs =
      motorClass === "AC"
        ? {
            ...prefillSpecsFromMotor(motor, AC_WORK_ORDER_FIELDS),
            ...(motor.acSpecs && typeof motor.acSpecs === "object" ? motor.acSpecs : {}),
          }
        : {};
    const dcSpecs =
      motorClass === "DC"
        ? {
            ...prefillSpecsFromMotor(motor, DC_WORK_ORDER_FIELDS),
            ...(motor.dcSpecs && typeof motor.dcSpecs === "object" ? motor.dcSpecs : {}),
          }
        : {};
    const armatureSpecs =
      motorClass === "DC"
        ? {
            ...prefillSpecsFromMotor(motor, DC_ARMATURE_FIELDS),
            ...(motor.dcArmatureSpecs && typeof motor.dcArmatureSpecs === "object"
              ? motor.dcArmatureSpecs
              : {}),
          }
        : {};

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
      technicianEmployeeId: "",
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
