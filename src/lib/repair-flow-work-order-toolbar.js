/**
 * Work order Actions (Create / View) on Job Write-Up after final repair is approved.
 * Uses the primary final RFQ id on the job (`finalFlowQuoteId`) — CRM Quote document (same as Quotes tab).
 */
const WO_TOOLBAR_PHASES = ["work_execution", "testing_qa", "completed"];

export function getRepairFlowWorkOrderToolbarState(job, quotes) {
  if (!job) {
    return {
      showWorkOrderActions: false,
      crmQuoteId: null,
      canCreateWorkOrder: false,
      createWorkOrderDisabledTitle: "",
    };
  }
  const finalId = String(job.finalFlowQuoteId || "").trim();
  const list = Array.isArray(quotes) ? quotes : [];
  const finalQ =
    list.find((q) => String(q.id) === finalId) ||
    list.find((q) => q.source === "crm" && String(q.motorRepairFlowQuoteId || "") === finalId);
  const crmId = String(
    finalQ?.crmQuoteId || (finalQ?.source === "crm" ? finalQ.id : "") || ""
  ).trim();
  const showWorkOrderActions = WO_TOOLBAR_PHASES.includes(job.phase) && !!finalId;
  return {
    showWorkOrderActions,
    crmQuoteId: crmId || null,
    canCreateWorkOrder: showWorkOrderActions && !!crmId,
    createWorkOrderDisabledTitle:
      showWorkOrderActions && !crmId
        ? "Set a primary final quote on this job (RFQ) before creating a work order."
        : "",
  };
}
