import mongoose from "mongoose";

/**
 * Append-only inventory movement ledger for Simple / Classic stock changes.
 * Live balances stay on InventoryItem; this collection is the audit trail.
 */
const MOVEMENT_TYPES = [
  "receive_po",
  "issue_job",
  "issue_shop",
  "return_stock",
  "adjust",
  "reserve",
  "release",
  "consume",
];

const inventoryMovementSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    /** Signed quantity: + inbound, − outbound. Reserve/release use absolute qty with type only. */
    qty: { type: Number, required: true },
    type: {
      type: String,
      enum: MOVEMENT_TYPES,
      required: true,
      trim: true,
    },
    purchaseOrderId: { type: String, default: "", trim: true },
    poLineId: { type: String, default: "", trim: true },
    poNumber: { type: String, default: "", trim: true },
    vendorName: { type: String, default: "", trim: true },
    simpleServiceProposalId: { type: String, default: "", trim: true },
    documentNumber: { type: String, default: "", trim: true },
    quoteId: { type: String, default: "", trim: true },
    workOrderId: { type: String, default: "", trim: true },
    reservationId: { type: String, default: "", trim: true },
    /** For return_stock: original issue movement id */
    relatedMovementId: { type: String, default: "", trim: true },
    reason: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    balanceAfter: { type: Number, default: null },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ createdByEmail: 1, inventoryItemId: 1, createdAt: -1 });
inventoryMovementSchema.index({ createdByEmail: 1, type: 1, createdAt: -1 });
inventoryMovementSchema.index({ createdByEmail: 1, purchaseOrderId: 1 });
inventoryMovementSchema.index({ createdByEmail: 1, simpleServiceProposalId: 1 });

export const INVENTORY_MOVEMENT_TYPES = MOVEMENT_TYPES;

if (process.env.NODE_ENV !== "production" && mongoose.models.InventoryMovement) {
  delete mongoose.models.InventoryMovement;
}

export default mongoose.models.InventoryMovement ??
  mongoose.model("InventoryMovement", inventoryMovementSchema);
