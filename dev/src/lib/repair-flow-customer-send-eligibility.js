/**
 * When the dashboard may send preliminary or final quote links to the customer (repair job).
 * @param {object|null} job — MotorRepairJob public shape (+ customerHasEmail)
 * @param {object[]} quotes — flow-quotes list
 */
export function getRepairFlowCustomerSendEligibility(job, quotes) {
  if (!job) {
    return { canSend: false, mode: null, sendDisabledTitle: "" };
  }
  const phase = job.phase;
  const prelimId = String(job.preliminaryFlowQuoteId || "").trim();
  const finalId = String(job.finalFlowQuoteId || "").trim();
  const hasCustomerEmail = !!job.customerHasEmail;
  const list = Array.isArray(quotes) ? quotes : [];

  if (phase === "awaiting_preliminary_approval" && prelimId) {
    return {
      canSend: hasCustomerEmail,
      mode: "preliminary",
      sendDisabledTitle: hasCustomerEmail ? "" : "Customer has no email on file.",
    };
  }
  if (phase === "awaiting_final_approval" && finalId) {
    const hasCrm = list.some(
      (q) =>
        q.source === "crm" &&
        (String(q.id) === finalId || String(q.motorRepairFlowQuoteId || "") === finalId)
    );
    return {
      canSend: hasCrm && hasCustomerEmail,
      mode: "final",
      sendDisabledTitle: !hasCustomerEmail
        ? "Customer has no email on file."
        : !hasCrm
          ? "Add or select a primary final RFQ on this job before sending."
          : "",
    };
  }
  return {
    canSend: false,
    mode: null,
    sendDisabledTitle:
      "Only available while waiting for preliminary or final quote approval (and, for final, an RFQ on this job).",
  };
}
