/**
 * Work order Actions (Create / View) on Job Write-Up. Menu always lists these; `canCreateWorkOrder` gates the form.
 * Uses the primary final RFQ id on the job (`finalFlowQuoteId`) — CRM Quote document (same as Quotes tab).
 * `showWorkOrderActions` is true only in execution phases (legacy / summaries); UI no longer hides menu items on it.
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
  const primaryRfqNumber = String(finalQ?.rfqNumber || finalQ?.crmRfqNumber || "").trim();
  const phaseOk = WO_TOOLBAR_PHASES.includes(job.phase);
  const showWorkOrderActions = phaseOk && !!finalId;
  const hasFinalLink = !!finalId;
  const hasCrmQuote = !!crmId;

  let createWorkOrderDisabledTitle = "";
  if (!hasFinalLink) {
    createWorkOrderDisabledTitle =
      "Set a primary final quote on this job before creating a work order.";
  } else if (!hasCrmQuote) {
    createWorkOrderDisabledTitle =
      "Set a primary final quote on this job (RFQ) before creating a work order.";
  } else if (!phaseOk) {
    createWorkOrderDisabledTitle =
      "Create work order after the final quote is approved (job moves to work execution).";
  }

  return {
    showWorkOrderActions,
    crmQuoteId: crmId || null,
    primaryRfqNumber,
    canCreateWorkOrder: phaseOk && hasFinalLink && hasCrmQuote,
    createWorkOrderDisabledTitle,
  };
}
