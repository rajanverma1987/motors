import PurchaseOrder from "@/models/PurchaseOrder";

/** Next display PO number for this shop (e.g. P00001, P00002). */
export async function getNextPoNumber(createdByEmail) {
  const list = await PurchaseOrder.find({
    createdByEmail,
    poNumber: { $regex: /^P\d+$/, $options: "i" },
  })
    .select("poNumber")
    .lean();
  let maxN = 0;
  for (const po of list) {
    const m = (po.poNumber || "").match(/^P(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  const next = maxN + 1;
  return "P" + String(next).padStart(5, "0");
}

/** Resolve CRM quote id for a job PO (explicit quoteId or latest quote on repair job). */
export async function resolveQuoteIdForJobPo(createdByEmail, quoteId, repairFlowJobId) {
  const qid = String(quoteId || "").trim();
  if (qid) return qid;
  const rjId = String(repairFlowJobId || "").trim();
  if (!rjId) return "";
  const Quote = (await import("@/models/Quote")).default;
  const quote = await Quote.findOne({ repairFlowJobId: rjId, createdByEmail })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();
  return quote?._id ? String(quote._id) : "";
}

/** Next job PO number for an RFQ (e.g. PO-A00001-1, PO-A00001-2). */
export async function getNextJobPoNumber(createdByEmail, quoteId, repairFlowJobId = "") {
  const resolvedQuoteId = await resolveQuoteIdForJobPo(createdByEmail, quoteId, repairFlowJobId);
  if (!resolvedQuoteId) return getNextPoNumber(createdByEmail);

  const Quote = (await import("@/models/Quote")).default;
  const quote = await Quote.findOne({ _id: resolvedQuoteId, createdByEmail }).select("rfqNumber").lean();
  const rfqNumber = String(quote?.rfqNumber || "").trim();
  if (!rfqNumber) return getNextPoNumber(createdByEmail);

  const existingCount = await PurchaseOrder.countDocuments({
    createdByEmail,
    type: "job",
    quoteId: resolvedQuoteId,
  });
  return `PO-${rfqNumber}-${existingCount + 1}`;
}

/** Next PO number based on type and optional RFQ link. */
export async function resolvePoNumber(createdByEmail, { type, quoteId, repairFlowJobId } = {}) {
  if (type === "job") {
    return getNextJobPoNumber(createdByEmail, quoteId, repairFlowJobId);
  }
  return getNextPoNumber(createdByEmail);
}
