import UserSettings from "@/models/UserSettings";
import { emitJobBoardEvent } from "@/lib/job-board-broadcast";
import { isSimpleBoardJob, simpleSpToBoardJob } from "@/lib/simple-job-board";

async function tokenForOwner(email) {
  const doc = await UserSettings.findOne({ ownerEmail: email })
    .select("settings.jobBoardToken")
    .lean();
  const t = doc?.settings?.jobBoardToken;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

/**
 * @param {import("mongoose").Document | Record<string, unknown>} doc work order doc or plain object with _id
 * @param {string} [customerCompany]
 */
export function workOrderToBoardPayload(doc, customerCompany) {
  const o = doc?.toObject?.() ?? doc;
  const id = o._id ? String(o._id) : o.id;
  return {
    id,
    status: String(o.status || "").trim(),
    workOrderNumber: o.workOrderNumber,
    customerCompany: customerCompany ?? o.customerCompany ?? o.companyName ?? "",
    quoteRfqNumber: o.quoteRfqNumber,
    motorClass: o.motorClass,
    companyName: o.companyName,
  };
}

export async function notifyWorkOrderBoardUpdated(email, workOrderPayload) {
  const token = await tokenForOwner(email);
  emitJobBoardEvent(email, token, { type: "workOrderUpdated", workOrder: workOrderPayload });
}

export async function notifyWorkOrderBoardCreated(email, workOrderPayload) {
  const token = await tokenForOwner(email);
  emitJobBoardEvent(email, token, { type: "workOrderCreated", workOrder: workOrderPayload });
}

export async function notifyWorkOrderBoardDeleted(email, workOrderId) {
  const token = await tokenForOwner(email);
  emitJobBoardEvent(email, token, { type: "workOrderDeleted", id: String(workOrderId) });
}

/**
 * Notify shop-floor board when a Simple JOB service proposal changes.
 * Uses the same SSE event shape as Classic work orders for shared clients.
 */
export async function notifySimpleJobBoardFromSp(email, previousDoc, nextDoc) {
  const token = await tokenForOwner(email);
  const wasJob = previousDoc ? isSimpleBoardJob(previousDoc) : false;
  const isJob = nextDoc ? isSimpleBoardJob(nextDoc) : false;

  if (isJob && nextDoc) {
    const payload = simpleSpToBoardJob(nextDoc);
    emitJobBoardEvent(email, token, {
      type: wasJob ? "workOrderUpdated" : "workOrderCreated",
      workOrder: payload,
    });
    return;
  }
  if (wasJob && previousDoc && !isJob) {
    const id = previousDoc._id != null ? String(previousDoc._id) : String(previousDoc.id || "");
    if (id) emitJobBoardEvent(email, token, { type: "workOrderDeleted", id });
  }
}

export async function notifySimpleJobBoardDeleted(email, simpleSpId) {
  await notifyWorkOrderBoardDeleted(email, simpleSpId);
}
