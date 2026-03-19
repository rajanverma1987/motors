import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import Quote from "@/models/Quote";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import { workOrderToBoardPayload, notifyWorkOrderBoardCreated } from "@/lib/job-board-emit";
import { notifyTechnicianWorkOrderAssigned } from "@/lib/notify-technician-work-order";
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
 * Find the next available work order number for this account + RFQ prefix.
 * Uses the highest existing numeric suffix and adds 1.
 * Example: W-A00001-1, W-A00001-2 → returns W-A00001-3.
 */
async function nextWorkOrderNumberSuggestion(email, safeRfq) {
  const prefix = `W-${safeRfq}-`;
  const latest = await WorkOrder.findOne({
    createdByEmail: email,
    workOrderNumber: { $regex: `^${prefix}\\d+$` },
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

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await WorkOrder.find({ createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    const customerIds = [...new Set(list.map((w) => w.customerId).filter(Boolean))];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      createdByEmail: email,
    })
      .lean()
      .catch(() => []);
    const custMap = Object.fromEntries(
      (customers || []).map((c) => [c._id.toString(), c.companyName || c.primaryContactName || ""])
    );
    return NextResponse.json(
      list.map((w) => ({
        ...w,
        id: w._id.toString(),
        _id: undefined,
        customerCompany: custMap[w.customerId] || "",
      }))
    );
  } catch (err) {
    console.error("List work orders:", err);
    return NextResponse.json({ error: "Failed to list work orders" }, { status: 500 });
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
    const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email });
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
    const safeRfq = rfq.replace(/[^\w-]/g, "") || "RFQ";
    const motorClass = motorClassFromMotorType(motor.motorType);
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const today = new Date().toISOString().slice(0, 10);
    const technicianEmployeeId = String(body.technicianEmployeeId || "").trim();
    const jobType =
      body.jobType === "field_frame_only" ? "field_frame_only" : "complete_motor";

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

    // Try a few times in case of rare concurrent inserts with the same prefix.
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
      const workOrderNumber = await nextWorkOrderNumberSuggestion(email, safeRfq);
      try {
        const doc = await WorkOrder.create({
          createdByEmail: email,
          quoteId,
          motorId: String(motor._id),
          customerId: String(quote.customerId),
          workOrderNumber,
          date: today,
          technicianEmployeeId,
          jobType,
          motorClass,
          status: initialStatusFromSettings(settingsDoc),
          companyName:
            customer?.companyName || customer?.primaryContactName || "",
          quoteRfqNumber: rfq,
          acSpecs,
          dcSpecs,
          armatureSpecs,
        });
        const o = doc.toObject();
        const payload = {
          ...o,
          id: doc._id.toString(),
          _id: undefined,
          customerCompany: o.companyName,
        };
        notifyWorkOrderBoardCreated(email, workOrderToBoardPayload(payload)).catch(() => {});
        if (technicianEmployeeId) {
          notifyTechnicianWorkOrderAssigned({
            shopEmail: email,
            assigneeEmployeeId: technicianEmployeeId,
            workOrderId: doc._id.toString(),
            workOrderNumber: doc.workOrderNumber,
            companyName: o.companyName,
            quoteRfqNumber: rfq,
          }).catch(() => {});
        }
        return NextResponse.json({
          ok: true,
          workOrder: payload,
        });
      } catch (err) {
        if (err.code === 11000) {
          // Conflict on unique workOrderNumber; try again with a higher suffix.
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    // If we reach here, repeated conflicts – surface as conflict.
    throw Object.assign(new Error("Work order number conflict; try again."), {
      code: 11000,
      cause: lastErr,
    });
  } catch (err) {
    console.error("Create work order:", err);
    if (err.code === 11000) {
      return NextResponse.json({ error: "Work order number conflict; try again." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
