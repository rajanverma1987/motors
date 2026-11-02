import mongoose from "mongoose";
import WorkOrder from "@/models/WorkOrder";
import Employee from "@/models/Employee";
import { isWriteUpStatus } from "@/lib/quote-rfq-lifecycle";
import { isWorkOrderOpenStatus } from "@/lib/work-order-open-status";
import { notifyTechnicianWorkOrderAssigned } from "@/lib/notify-technician-work-order";

/**
 * Resolve and validate an Employee id for quote assignment.
 * @returns {Promise<string>} canonical id string, "" to clear, or null if invalid
 */
async function validateTechnicianEmployeeId(email, technicianEmployeeId) {
  const techId = String(technicianEmployeeId || "").trim();
  if (!techId) return "";
  const emailNorm = String(email || "")
    .trim()
    .toLowerCase();

  const idCandidates = [];
  if (mongoose.Types.ObjectId.isValid(techId)) {
    idCandidates.push(new mongoose.Types.ObjectId(techId));
  }
  idCandidates.push(techId);

  for (const idVal of idCandidates) {
    const emp = await Employee.findOne({
      _id: idVal,
      createdByEmail: emailNorm,
    })
      .select({ _id: 1 })
      .lean();
    if (emp) return emp._id.toString();
  }

  const byExternalRef = await Employee.findOne({
    createdByEmail: emailNorm,
    externalRef: techId,
  })
    .select({ _id: 1 })
    .lean();
  if (byExternalRef) return byExternalRef._id.toString();

  return null;
}

/**
 * Sync quote technician onto existing open work orders only.
 * Write-Up RFQs never auto-create work orders — use mobile pre-inspection + manual Create Work Order on web.
 * @param {string} email — shop owner email
 * @param {import("mongoose").Document | object} quoteDoc
 */
export async function syncQuoteTechnicianToWorkOrders(email, quoteDoc) {
  if (isWriteUpStatus(quoteDoc.status)) return;

  const shopEmail = String(email || "")
    .trim()
    .toLowerCase();
  const quoteId = quoteDoc._id?.toString?.() ?? String(quoteDoc._id || "");
  if (!quoteId) return;

  const techId = String(quoteDoc.technicianEmployeeId || "").trim();
  const wos = await WorkOrder.find({ createdByEmail: shopEmail, quoteId }).lean();
  const openWos = wos.filter((w) => isWorkOrderOpenStatus(w.status));

  for (const wo of openWos) {
    const prev = String(wo.technicianEmployeeId || "").trim();
    if (prev === techId) continue;
    await WorkOrder.updateOne({ _id: wo._id }, { $set: { technicianEmployeeId: techId } });
    if (techId) {
      notifyTechnicianWorkOrderAssigned({
        shopEmail,
        assigneeEmployeeId: techId,
        workOrderId: wo._id.toString(),
        workOrderNumber: wo.workOrderNumber || "",
        companyName: wo.companyName || "",
        quoteRfqNumber: wo.quoteRfqNumber || "",
        repairJobNumber: wo.repairJobNumber || "",
      }).catch(() => {});
    }
  }
}

export { validateTechnicianEmployeeId };
