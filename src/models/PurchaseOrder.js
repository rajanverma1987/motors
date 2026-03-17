import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    /** Auto-generated unique display id per shop, e.g. P00001 */
    poNumber: { type: String, default: "", trim: true },
    /** Vendor id (dashboard Vendor) */
    vendorId: { type: String, required: true, trim: true },
    /** job = linked to Quote (RFQ#); shop = not linked */
    type: { type: String, required: true, enum: ["job", "shop"], default: "shop", trim: true },
    /** Quote id (optional; for type "job") */
    quoteId: { type: String, default: "", trim: true },
    /** Line items: description, qty, unit price, status for vendor delivery tracking */
    lineItems: [
      {
        description: { type: String, default: "", trim: true },
        qty: { type: String, default: "1", trim: true },
        uom: { type: String, default: "", trim: true },
        unitPrice: { type: String, default: "", trim: true },
        status: { type: String, enum: ["Ordered", "Dispatch", "Received"], default: "Ordered", trim: true },
      },
    ],
    /** Vendor invoices attached to this PO */
    vendorInvoices: [
      {
        invoiceNumber: { type: String, default: "", trim: true },
        date: { type: String, default: "", trim: true },
        amount: { type: String, default: "", trim: true },
        attachmentUrl: { type: String, default: "", trim: true },
        attachmentName: { type: String, default: "", trim: true },
      },
    ],
    /** Payments recorded against this PO */
    payments: [
      {
        amount: { type: String, default: "", trim: true },
        date: { type: String, default: "", trim: true },
        method: { type: String, default: "", trim: true },
        reference: { type: String, default: "", trim: true },
      },
    ],
    notes: { type: String, default: "", trim: true },
    /** Token for vendor-facing view/print link (no auth); generated on first "Send to Vendor" */
    vendorShareToken: { type: String, default: "", trim: true },
    /** Shop that owns this PO (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ createdByEmail: 1, createdAt: -1 });
purchaseOrderSchema.index({ createdByEmail: 1, poNumber: 1 }, { unique: true, sparse: true });
purchaseOrderSchema.index({ vendorShareToken: 1 }, { unique: true, sparse: true });
purchaseOrderSchema.index({ createdByEmail: 1, vendorId: 1 });
purchaseOrderSchema.index({ createdByEmail: 1, quoteId: 1 });

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", purchaseOrderSchema);
