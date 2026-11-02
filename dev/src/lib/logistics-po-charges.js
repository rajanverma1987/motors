import mongoose from "mongoose";
import PurchaseOrder from "@/models/PurchaseOrder";
import LogisticsEntry from "@/models/LogisticsEntry";

function round2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

function parseChargeAmount(raw) {
  const n = parseFloat(String(raw ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return round2(n);
}

function normalizePaidBy(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "company" ? "company" : v === "vendor" ? "vendor" : "";
}

/**
 * Rebuild PO otherCharges from all vendor PO receiving logistics entries for this PO.
 * @param {string|import("mongoose").Types.ObjectId} purchaseOrderId
 * @param {string} ownerEmail
 * @param {{ overrideEntryId?: string, overridePaidBy?: string, overrideAmount?: string }} [override]
 */
export async function reconcilePoOtherChargesFromLogistics(
  purchaseOrderId,
  ownerEmail,
  override = {}
) {
  const email = ownerEmail.trim().toLowerCase();
  const poId = String(purchaseOrderId || "").trim();
  if (!poId || !mongoose.Types.ObjectId.isValid(poId)) {
    return { ok: false, error: "Invalid purchase order" };
  }

  const poOid = new mongoose.Types.ObjectId(poId);
  const poExists = await PurchaseOrder.exists({ _id: poOid, createdByEmail: email });
  if (!poExists) {
    return { ok: false, error: "Purchase order not found" };
  }

  const entries = await LogisticsEntry.find({
    createdByEmail: email,
    kind: "vendor_po_receiving",
    purchaseOrderId: poOid,
  })
    .sort({ createdAt: 1 })
    .lean();

  const overrideId = String(override.overrideEntryId || "").trim();
  const otherCharges = [];

  for (const entry of entries) {
    const entryId = String(entry._id);
    let paidBy = entry.logisticsChargesPaidBy;
    let amount = entry.logisticsChargesAmount;
    if (overrideId && entryId === overrideId) {
      if (override.overridePaidBy !== undefined) paidBy = override.overridePaidBy;
      if (override.overrideAmount !== undefined) amount = override.overrideAmount;
    }
    if (normalizePaidBy(paidBy) !== "company") continue;
    const chargeAmt = parseChargeAmount(amount);
    if (chargeAmt <= 0) continue;
    otherCharges.push({
      label: "Logistics charges",
      amount: chargeAmt.toFixed(2),
      logisticsEntryId: entry._id,
      addedAt: entry.updatedAt || entry.createdAt || new Date(),
    });
  }

  await PurchaseOrder.updateOne(
    { _id: poOid, createdByEmail: email },
    { $set: { otherCharges } }
  );

  return { ok: true, otherCharges };
}

/**
 * @param {object} opts
 */
export async function syncLogisticsChargesToPo({
  purchaseOrderId,
  ownerEmail,
  logisticsEntryId,
  paidBy,
  amount,
}) {
  return reconcilePoOtherChargesFromLogistics(purchaseOrderId, ownerEmail, {
    overrideEntryId: logisticsEntryId,
    overridePaidBy: paidBy,
    overrideAmount: amount,
  });
}

/**
 * Remove logistics-sourced charges after entry delete or PO unlink.
 */
export async function removeLogisticsChargesFromPo(purchaseOrderId, ownerEmail) {
  return reconcilePoOtherChargesFromLogistics(purchaseOrderId, ownerEmail);
}
