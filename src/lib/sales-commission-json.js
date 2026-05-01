/**
 * Serialize a SalesCommission document (lean or hydrated) for dashboard API JSON.
 * @param {object} doc
 * @param {{ includeAttachments?: boolean }} [opts]
 */
export function commissionToJson(doc, { includeAttachments = false } = {}) {
  const row = doc && (doc.toObject ? doc.toObject() : doc);
  if (!row) return null;
  const attachments = Array.isArray(row.attachments)
    ? row.attachments.map((a) => ({ url: String(a?.url ?? "").trim(), name: String(a?.name ?? "").trim() }))
    : [];
  const attachmentCount = attachments.length;
  return {
    id: row._id?.toString(),
    quoteId: row.quoteId ?? "",
    rfqNumber: row.rfqNumber ?? "",
    repairFlowJobId: row.repairFlowJobId ?? "",
    jobNumber: row.jobNumber ?? "",
    salesPersonId: row.salesPersonId ?? "",
    salesPersonName: row.salesPersonName ?? "",
    amount: Number(row.amount || 0),
    status: row.status === "paid" ? "paid" : "unpaid",
    paidAt: row.paidAt ?? null,
    attachmentCount,
    ...(includeAttachments ? { attachments } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
