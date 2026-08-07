import mongoose from "mongoose";

/**
 * Simple portal (/dashboards) purchase orders — Job PO and Shop PO.
 * Uses strict:false so the full PO form payload (line items, payment fields) is stored.
 */
const simplePurchaseOrderSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true },
    poType: { type: String, default: "job", trim: true },
    serviceProposalId: { type: String, default: "", trim: true },
    jobNumber: { type: String, default: "", trim: true },
    poNumber: { type: String, default: "", trim: true },
    vendorId: { type: String, default: "", trim: true },
    vendorName: { type: String, default: "", trim: true },
    paymentStatus: { type: String, default: "Unpaid", trim: true },
    poCutDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    /** Import metadata for external system linking */
    sourceSystem: { type: String, default: "", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
  },
  { timestamps: true, strict: false }
);

simplePurchaseOrderSchema.index({ createdByEmail: 1, updatedAt: -1 });
simplePurchaseOrderSchema.index({ createdByEmail: 1, poNumber: 1 });
simplePurchaseOrderSchema.index({ createdByEmail: 1, serviceProposalId: 1 });
simplePurchaseOrderSchema.index({ createdByEmail: 1, jobNumber: 1 });
simplePurchaseOrderSchema.index({ createdByEmail: 1, vendorId: 1 });
simplePurchaseOrderSchema.index({ createdByEmail: 1, poCutDate: -1 });
simplePurchaseOrderSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $gt: "" } } }
);

export default mongoose.models.SimplePurchaseOrder ||
  mongoose.model("SimplePurchaseOrder", simplePurchaseOrderSchema);
