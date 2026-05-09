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
import { workOrderToBoardPayload, notifyWorkOrderBoardCreated } from "@/lib/job-board-emit";
import { notifyTechnicianWorkOrderAssigned } from "@/lib/notify-technician-work-order";
import {
  motorClassFromMotorType,
  normalizeWorkOrderJobType,
  prefillSpecsFromMotor,
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  DEFAULT_WORK_ORDER_STATUSES,
} from "@/lib/work-order-fields";
import { reserveInventoryForQuoteIfFirstWorkOrder } from "@/lib/inventory-service";
import { effectiveWorkOrderNumberPrefix } from "@/lib/document-number-prefixes";

function initialStatusFromSettings(settingsDoc) {
  const u = mergeUserSettings(settingsDoc?.settings);
  const list = u.workOrderStatuses?.length ? u.workOrderStatuses : DEFAULT_WORK_ORDER_STATUSES;
  if (list.includes("Assigned")) return "Assigned";
  return list[0] || "Assigned";
}

/**
 * Find the next available work order number for this account + label (Job# or RFQ-derived slug).
 * Example: W-RF00042-1, W-RF00042-2 → returns W-RF00042-3.
 */
async function nextWorkOrderNumberSuggestion(email, safeSegment, woHead) {
  const head = String(woHead || "W-");
  const escHead = head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escSeg = String(safeSegment).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `^${escHead}${escSeg}-\\d+$`;
  const latest = await WorkOrder.findOne({
    createdByEmail: email,
    workOrderNumber: { $regex: pattern },
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
  return `${head}${safeSegment}-${next}`;
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const includePagination =
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "createdAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      workOrderNumber: "workOrderNumber",
      quoteRfqNumber: "quoteRfqNumber",
      status: "status",
      date: "date",
      customerCompany: "companyName",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ workOrderNumber: rx }, { quoteRfqNumber: rx }, { status: rx }, { companyName: rx }];
    }
    const [totalCount, list] = await Promise.all([
      WorkOrder.countDocuments(q),
      WorkOrder.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
    ]);
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
    const items = list.map((w) => ({
        ...w,
        id: w._id.toString(),
        _id: undefined,
        customerCompany: custMap[w.customerId] || "",
      }));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({ items, page, pageSize, totalCount });
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
    const quoteStatus = String(quote.status || "draft").trim().toLowerCase();
    if (quoteStatus !== "approved") {
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
    const motorClass = motorClassFromMotorType(motor.motorType);
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const mergedSettings = mergeUserSettings(settingsDoc?.settings);
    const woHead = effectiveWorkOrderNumberPrefix(mergedSettings);
    const today = new Date().toISOString().slice(0, 10);
    const technicianEmployeeId = String(body.technicianEmployeeId || "").trim();
    const jobType = normalizeWorkOrderJobType(body.jobType, motorClass);

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
      const workOrderNumber = await nextWorkOrderNumberSuggestion(email, safeSegment, woHead);
      try {
        const doc = await WorkOrder.create({
          createdByEmail: email,
          quoteId,
          repairFlowJobId,
          repairJobNumber,
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
            repairJobNumber,
          }).catch(() => {});
        }
        try {
          await reserveInventoryForQuoteIfFirstWorkOrder(email, quoteId, doc._id.toString());
        } catch (invErr) {
          console.error("Reserve inventory for quote:", invErr);
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
