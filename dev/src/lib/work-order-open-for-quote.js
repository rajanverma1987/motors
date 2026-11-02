import WorkOrder from "@/models/WorkOrder";
import { isWorkOrderOpenStatus } from "@/lib/work-order-open-status";

/**
 * Open work orders linked to a quote (newest first).
 * @param {string} email
 * @param {string} quoteId
 * @returns {Promise<Array<{ id: string, workOrderNumber: string, status: string }>>}
 */
export async function findOpenWorkOrdersForQuote(email, quoteId) {
  const qid = String(quoteId || "").trim();
  if (!qid) return [];
  const list = await WorkOrder.find({ createdByEmail: email, quoteId: qid })
    .sort({ createdAt: -1 })
    .select("workOrderNumber status")
    .lean();
  return list
    .filter((w) => isWorkOrderOpenStatus(w.status))
    .map((w) => ({
      id: w._id.toString(),
      workOrderNumber: String(w.workOrderNumber || "").trim(),
      status: String(w.status || "").trim(),
    }));
}
