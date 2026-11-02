import mongoose from "mongoose";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import { toPublicInspection } from "@/lib/motor-inspection-api";

/**
 * @param {object} wo — lean WorkOrder
 * @param {string} email
 */
export function inspectionQueryForWorkOrder(wo, email) {
  const woId = wo._id.toString();
  const or = [{ workOrderId: woId, createdByEmail: email }];
  const quoteId = String(wo.quoteId || "").trim();
  if (quoteId) {
    or.push({ quoteId, createdByEmail: email });
  }
  const legacyJobId = String(wo.repairFlowJobId || "").trim();
  if (legacyJobId && mongoose.isValidObjectId(legacyJobId)) {
    or.push({ jobId: legacyJobId, createdByEmail: email });
  }
  return { $or: or };
}

/**
 * @param {object} wo — lean WorkOrder
 * @param {string} email
 */
export async function listInspectionsForWorkOrder(wo, email) {
  const list = await MotorRepairInspection.find(inspectionQueryForWorkOrder(wo, email))
    .sort({ createdAt: 1 })
    .lean();
  return list.map((r) => toPublicInspection(r));
}
