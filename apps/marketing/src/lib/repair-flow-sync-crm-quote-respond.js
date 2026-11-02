import mongoose from "mongoose";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import { executionStagesInitial } from "@/lib/repair-flow-constants";

/**
 * When a customer approves/rejects via /api/quotes/respond, mirror dashboard
 * approve_final / reject_final on the linked Job Write-Up when the CRM RFQ is the job’s primary final quote.
 * Legacy: job.finalFlowQuoteId may point at a MotorRepairFlowQuote id linked via motorRepairFlowQuoteId.
 *
 * @param {import("mongoose").Document} savedQuoteDoc — persisted CRM Quote
 * @param {"approve" | "reject"} action
 */
export async function syncRepairFlowJobAfterCrmCustomerRespond(savedQuoteDoc, action) {
  const email = String(savedQuoteDoc.createdByEmail || "").trim().toLowerCase();
  if (!email) return;

  const crmId = String(savedQuoteDoc._id || "").trim();
  const flowLink = String(savedQuoteDoc.motorRepairFlowQuoteId || "").trim();

  const job = await MotorRepairJob.findOne({
    createdByEmail: email,
    $or: [
      ...(mongoose.isValidObjectId(crmId) ? [{ finalFlowQuoteId: crmId }] : []),
      ...(mongoose.isValidObjectId(flowLink) ? [{ finalFlowQuoteId: flowLink }] : []),
    ],
  });

  if (!job || job.phase !== "awaiting_final_approval") return;

  const finalFid = String(job.finalFlowQuoteId || "").trim();
  const isPrimaryFinal =
    (mongoose.isValidObjectId(crmId) && finalFid === crmId) ||
    (mongoose.isValidObjectId(flowLink) && finalFid === flowLink);
  if (!isPrimaryFinal) return;

  if (mongoose.isValidObjectId(flowLink) && finalFid === flowLink) {
    const fq = await MotorRepairFlowQuote.findOne({ _id: flowLink, createdByEmail: email, stage: "final" });
    if (fq) {
      fq.status = action === "approve" ? "locked" : "rejected";
      await fq.save();
    }
  }

  if (action === "approve") {
    job.phase = "work_execution";
    if (!job.executionStages?.length) {
      job.executionStages = executionStagesInitial();
    }
    await job.save();
  } else {
    job.phase = "closed_returned";
    await job.save();
  }
}
