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
