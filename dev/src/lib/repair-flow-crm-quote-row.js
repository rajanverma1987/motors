/**
 * Map CRM Quote (RFQ) documents to the shape used by Job Write-Up quotes table + print.
 * Final repair quotes are stored only in the Quote collection; updates on the Quotes page show here.
 */

/**
 * Flow-quote table status (badges) derived from CRM status + job phase.
 * @param {string} crmStatus — draft | sent | approved | rejected | rnr
 * @param {string} jobPhase
 * @param {string} quoteObjectId
 * @param {string} jobFinalFlowQuoteId — primary final RFQ id (CRM _id)
 */
export function crmQuoteStatusForJobTable(crmStatus, jobPhase, quoteObjectId, jobFinalFlowQuoteId) {
  const s = String(crmStatus || "").toLowerCase();
  const isPrimary = String(quoteObjectId || "").trim() === String(jobFinalFlowQuoteId || "").trim();
  const lockedPhases = ["work_execution", "testing_qa", "completed"];
  if (isPrimary && lockedPhases.includes(jobPhase) && (s === "approved" || s === "sent" || s === "draft")) {
    return "locked";
  }
  if (s === "sent") return "waiting_approval";
  if (s === "approved") return "approved";
  if (s === "rejected" || s === "rnr") return "rejected";
  return "draft";
}

/**
 * @param {object} crmLean — Quote lean doc
 * @param {{ phase?: string, finalFlowQuoteId?: string }} jobLean
 */
export function crmQuoteToFlowQuoteShape(crmLean, jobLean) {
  const labor = parseFloat(crmLean.laborTotal) || 0;
  const parts = parseFloat(crmLean.partsTotal) || 0;
  const subtotal = labor + parts;
  const id = crmLean._id?.toString?.() ?? String(crmLean._id);
  const jobPhase = jobLean?.phase ?? "";
  const finalFid = String(jobLean?.finalFlowQuoteId ?? "").trim();
  const status = crmQuoteStatusForJobTable(crmLean.status, jobPhase, id, finalFid);
  return {
    id,
    stage: "final",
    status,
    crmQuoteId: id,
    motorRepairFlowQuoteId: String(crmLean.motorRepairFlowQuoteId || "").trim() || null,
    crmRfqNumber: crmLean.rfqNumber || null,
    subtotal,
    updatedAt: crmLean.updatedAt,
    createdAt: crmLean.createdAt,
    source: "crm",
    lineItems: [],
    scopeLines: Array.isArray(crmLean.scopeLines) ? crmLean.scopeLines : [],
    partsLines: Array.isArray(crmLean.partsLines) ? crmLean.partsLines : [],
    laborTotal: crmLean.laborTotal ?? "",
    partsTotal: crmLean.partsTotal ?? "",
    quoteNotes: crmLean.notes ?? "",
    customerNotes: crmLean.customerNotes ?? "",
    rfqNumber: crmLean.rfqNumber ?? "",
  };
}
