import mongoose from "mongoose";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import MotorRepairJob from "@/models/MotorRepairJob";

/**
 * Resolve Job Write-Up job id for a CRM Quote (RFQ), for inspections + linking UI.
 * Uses repairFlowJobId when valid; otherwise motorRepairFlowQuoteId via flow quote or job.finalFlowQuoteId / preliminaryFlowQuoteId.
 *
 * @param {{ repairFlowJobId?: string, motorRepairFlowQuoteId?: string }} quoteLean
 * @param {string} userEmail portal owner (shop) email
 * @returns {Promise<string>} job ObjectId string or ""
 */
export async function resolveRepairFlowJobIdForQuote(quoteLean, userEmail) {
  const email = String(userEmail || "")
    .trim()
    .toLowerCase();
  const storedJob = String(quoteLean?.repairFlowJobId ?? "").trim();
  if (storedJob && mongoose.isValidObjectId(storedJob)) {
    return storedJob;
  }

  const quoteId = String(quoteLean?._id ?? quoteLean?.id ?? "").trim();
  if (quoteId && mongoose.isValidObjectId(quoteId)) {
    const jobByCrmFinal = await MotorRepairJob.findOne({
      createdByEmail: email,
      finalFlowQuoteId: quoteId,
    })
      .select("_id")
      .lean();
    if (jobByCrmFinal?._id) {
      return String(jobByCrmFinal._id);
    }
  }

  const flowQuoteId = String(quoteLean?.motorRepairFlowQuoteId ?? "").trim();
  if (!flowQuoteId || !mongoose.isValidObjectId(flowQuoteId)) {
    return storedJob;
  }

  const fq = await MotorRepairFlowQuote.findById(flowQuoteId).select("jobId createdByEmail").lean();
  if (fq?.jobId && String(fq.createdByEmail || "").trim().toLowerCase() === email) {
    return String(fq.jobId).trim();
  }

  const jobByFinal = await MotorRepairJob.findOne({
    createdByEmail: email,
    finalFlowQuoteId: flowQuoteId,
  })
    .select("_id")
    .lean();
  if (jobByFinal?._id) {
    return String(jobByFinal._id);
  }

  const jobByPrelim = await MotorRepairJob.findOne({
    createdByEmail: email,
    preliminaryFlowQuoteId: flowQuoteId,
  })
    .select("_id")
    .lean();
  if (jobByPrelim?._id) {
    return String(jobByPrelim._id);
  }

  return storedJob;
}
