import Quote from "@/models/Quote";

/** Next RFQ number for this shop: A00001, A00002, … */
export async function getNextRfqNumber(createdByEmail) {
  const email = createdByEmail.trim().toLowerCase();
  const list = await Quote.find({ createdByEmail: email }, { rfqNumber: 1 }).lean();
  let maxNum = 0;
  for (const q of list) {
    const m = (q.rfqNumber || "").match(/^A(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return "A" + String(maxNum + 1).padStart(5, "0");
}
