import PurchaseOrder from "@/models/PurchaseOrder";

/** Job PO display number, e.g. PO-A00001-1 */
export function formatJobPoNumber(rfqNumber, sequence) {
  const rfq = String(rfqNumber || "").trim();
  const seq = Number(sequence);
  if (!rfq || !Number.isFinite(seq) || seq < 1) return "";
  return `PO-${rfq}-${seq}`;
}

/** Whether poNumber already uses PO-{RFQ#}-{n}. */
export function isJobPoNumberFormat(poNumber) {
  return /^PO-.+-\d+$/i.test(String(poNumber || "").trim());
}

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

/**
 * Build ordered job PO renames for one shop: PO-{RFQ#}-1, PO-{RFQ#}-2, … by createdAt.
 * @param {Array<{ _id: unknown, poNumber?: string, quoteId?: string, repairFlowJobId?: string, createdAt?: Date|string }>} jobPos
 * @param {Map<string, { rfqNumber?: string }>} quoteById
 * @param {(email: string, quoteId: string, repairFlowJobId: string) => Promise<string>} resolveQuoteId
 */
export async function buildJobPoRenumberPlan(jobPos, quoteById, resolveQuoteId) {
  const groups = new Map();

  for (const po of jobPos) {
    const email = String(po.createdByEmail || "").trim().toLowerCase();
    const resolvedQuoteId = await resolveQuoteId(
      email,
      po.quoteId,
      po.repairFlowJobId
    );
    if (!resolvedQuoteId) continue;

    const key = `${email}\0${resolvedQuoteId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ po, resolvedQuoteId });
  }

  const updates = [];
  for (const [key, entries] of groups) {
    const [email, quoteId] = key.split("\0");
    const rfqNumber = String(quoteById.get(quoteId)?.rfqNumber || "").trim();
    if (!rfqNumber) continue;

    entries.sort(
      (a, b) => new Date(a.po.createdAt || 0).getTime() - new Date(b.po.createdAt || 0).getTime()
    );

    entries.forEach(({ po, resolvedQuoteId }, index) => {
      const newNumber = formatJobPoNumber(rfqNumber, index + 1);
      const oldNumber = String(po.poNumber || "").trim();
      const quoteIdWasEmpty = !String(po.quoteId || "").trim();
      if (oldNumber !== newNumber || quoteIdWasEmpty) {
        updates.push({
          id: String(po._id),
          email,
          oldNumber,
          newNumber,
          quoteId,
          setQuoteId: quoteIdWasEmpty ? quoteId : "",
        });
      }
    });
  }

  return updates;
}

/** Next PO number based on type and optional RFQ link. */
export async function resolvePoNumber(createdByEmail, { type, quoteId, repairFlowJobId } = {}) {
  if (type === "job") {
    return getNextJobPoNumber(createdByEmail, quoteId, repairFlowJobId);
  }
  return getNextPoNumber(createdByEmail);
}
