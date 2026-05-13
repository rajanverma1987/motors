import mongoose from "mongoose";
import WorkOrder from "@/models/WorkOrder";
import MotorRepairJob from "@/models/MotorRepairJob";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  motorClassFromMotorType,
  normalizeWorkOrderJobType,
  prefillSpecsFromMotor,
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  DEFAULT_WORK_ORDER_STATUSES,
} from "@/lib/work-order-fields";
import { effectiveWorkOrderNumberPrefix, workOrderNumberStem, workOrderNumberPatternRegex } from "@/lib/document-number-prefixes";
import { reserveInventoryForQuoteIfFirstWorkOrder } from "@/lib/inventory-service";
import { workOrderToBoardPayload, notifyWorkOrderBoardCreated } from "@/lib/job-board-emit";
import { notifyTechnicianWorkOrderAssigned } from "@/lib/notify-technician-work-order";

export function initialStatusFromSettings(settingsDoc) {
  const u = mergeUserSettings(settingsDoc?.settings);
  const list = u.workOrderStatuses?.length ? u.workOrderStatuses : DEFAULT_WORK_ORDER_STATUSES;
  if (list.includes("Assigned")) return "Assigned";
  return list[0] || "Assigned";
}

/**
 * Pick a "closed / done" WO label from the shop's configured list (for backfills).
 * Prefers a label matching /close/i, then Shipped, then Completed, then last list entry.
 * @param {object | null | undefined} settingsDoc
 */
export function resolvedClosedWorkOrderStatus(settingsDoc) {
  const u = mergeUserSettings(settingsDoc?.settings);
  const list =
    Array.isArray(u.workOrderStatuses) && u.workOrderStatuses.length
      ? u.workOrderStatuses
      : DEFAULT_WORK_ORDER_STATUSES;
  const closeMatch = list.find((s) => /\bclose/i.test(String(s ?? "").trim()));
  if (closeMatch) return String(closeMatch).trim();
  const shipped = list.find((s) => String(s).toLowerCase() === "shipped");
  if (shipped) return String(shipped).trim();
  const completed = list.find((s) => String(s).toLowerCase() === "completed");
  if (completed) return String(completed).trim();
  return String(list[list.length - 1] || "Shipped").trim();
}

/**
 * Find the next available work order number for this account + label (Job# or RFQ-derived slug).
 * Example: W-RF00042-1, W-RF00042-2 → returns W-RF00042-3.
 */
export async function nextWorkOrderNumberSuggestion(email, safeSegment, woHead) {
  const stem = workOrderNumberStem(woHead, safeSegment);
  const rx = workOrderNumberPatternRegex(stem);
  const latest = await WorkOrder.findOne({
    createdByEmail: email,
    workOrderNumber: rx,
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
  return `${stem}-${next}`;
}

/**
 * @param {object} params
 * @param {string} params.email
 * @param {object} params.quote — lean quote with _id, motorId, customerId, rfqNumber, repairFlowJobId, status
 * @param {object} params.motor — lean motor
 * @param {object} params.customer — lean customer
 * @param {object | null} params.settingsDoc — UserSettings lean doc or null
 * @param {object} [params.options]
 * @param {string} [params.options.technicianEmployeeId]
 * @param {string} [params.options.jobType]
 * @param {string} [params.options.forcedStatus] — when set, stored as WO status (e.g. backfill "Closed")
 * @param {boolean} [params.options.skipQuoteApprovalCheck]
 * @param {boolean} [params.options.reserveInventory] — default true
 * @param {boolean} [params.options.notifyBoard] — default true
 * @param {boolean} [params.options.notifyAssignee] — default true
 * @param {string} [params.options.notes] — optional work order notes
 * @returns {Promise<{ ok: true, workOrder: object } | { ok: false, error: string, httpStatus: number }>}
 */
export async function createWorkOrderForQuote({
  email,
  quote,
  motor,
  customer,
  settingsDoc,
  options = {},
}) {
  const {
    technicianEmployeeId = "",
    jobType: jobTypeRaw = "",
    forcedStatus = "",
    skipQuoteApprovalCheck = false,
    reserveInventory = true,
    notifyBoard = true,
    notifyAssignee = true,
    notes: notesOpt = "",
  } = options;

  const quoteId = String(quote._id);
  const quoteStatus = String(quote.status || "draft").trim().toLowerCase();
  if (!skipQuoteApprovalCheck && quoteStatus !== "approved") {
    return { ok: false, error: "Quote must be approved before creating a work order", httpStatus: 400 };
  }

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
  const mergedSettings = mergeUserSettings(settingsDoc?.settings);
  const woHead = effectiveWorkOrderNumberPrefix(mergedSettings);
  const today = new Date().toISOString().slice(0, 10);
  const techId = String(technicianEmployeeId || "").trim();
  const jobType = normalizeWorkOrderJobType(jobTypeRaw, motorClass);

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
          ...(motor.dcArmatureSpecs && typeof motor.dcArmatureSpecs === "object" ? motor.dcArmatureSpecs : {}),
        }
      : {};

  const statusToStore = String(forcedStatus || "").trim() || initialStatusFromSettings(settingsDoc);
  const notes = String(notesOpt || "").trim().slice(0, 8000);

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
        technicianEmployeeId: techId,
        jobType,
        motorClass,
        status: statusToStore,
        companyName: customer?.companyName || customer?.primaryContactName || "",
        quoteRfqNumber: rfq,
        acSpecs,
        dcSpecs,
        armatureSpecs,
        notes,
      });
      const o = doc.toObject();
      const payload = {
        ...o,
        id: doc._id.toString(),
        _id: undefined,
        customerCompany: o.companyName,
      };
      if (notifyBoard) {
        notifyWorkOrderBoardCreated(email, workOrderToBoardPayload(payload)).catch(() => {});
      }
      if (notifyAssignee && techId) {
        notifyTechnicianWorkOrderAssigned({
          shopEmail: email,
          assigneeEmployeeId: techId,
          workOrderId: doc._id.toString(),
          workOrderNumber: doc.workOrderNumber,
          companyName: o.companyName,
          quoteRfqNumber: rfq,
          repairJobNumber,
        }).catch(() => {});
      }
      if (reserveInventory) {
        try {
          await reserveInventoryForQuoteIfFirstWorkOrder(email, quoteId, doc._id.toString());
        } catch (invErr) {
          console.error("Reserve inventory for quote:", invErr);
        }
      }
      return { ok: true, workOrder: payload };
    } catch (err) {
      if (err.code === 11000) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  return {
    ok: false,
    error: "Work order number conflict; try again.",
    httpStatus: 409,
    cause: lastErr,
  };
}
