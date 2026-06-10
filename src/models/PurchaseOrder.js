import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    /** Auto-generated unique display id per shop, e.g. P00001 */
    poNumber: { type: String, default: "", trim: true },
    /** Vendor id (dashboard Vendor) */
    vendorId: { type: String, required: true, trim: true },
    vendorSourceSystem: { type: String, default: "", trim: true },
    vendorExternalRef: { type: String, default: "", trim: true },
    /** job = linked to Quote (RFQ#); shop = not linked */
    type: { type: String, required: true, enum: ["job", "shop"], default: "shop", trim: true },
    /** Quote id (optional; for type "job") — CRM RFQ when present */
    quoteId: { type: String, default: "", trim: true },
    /** MotorRepairJob id (optional; for type "job") — job write-up number */
    repairFlowJobId: { type: String, default: "", trim: true },
    /** Line items: description, qty, unit price, status for vendor delivery tracking */
    lineItems: [
      {
        description: { type: String, default: "", trim: true },
        qty: { type: String, default: "1", trim: true },
        uom: { type: String, default: "", trim: true },
        unitPrice: { type: String, default: "", trim: true },
        /** Tax rate for this line (percent, e.g. 8.25); line total = qty×unit×(1+tax%/100) */
        taxPercent: { type: String, default: "0", trim: true },
        /** When set, logistics receiving this line adds qty to this inventory SKU */
        inventoryItemId: { type: String, default: "", trim: true },
        status: {
          type: String,
          enum: ["Ordered", "Dispatch", "Received", "Back Order"],
          default: "Ordered",
          trim: true,
        },
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
        notes: { type: String, default: "", trim: true },
        recordedAt: { type: Date, default: Date.now },
      },
    ],
    /** Added from logistics receiving (e.g. company-paid freight); included in PO grand total */
    otherCharges: {
      type: [
        {
          label: { type: String, default: "Logistics charges", trim: true },
          amount: { type: String, default: "", trim: true },
          logisticsEntryId: { type: mongoose.Schema.Types.ObjectId, default: null },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    notes: { type: String, default: "", trim: true },
    /** Dashboard uploads: { url, name } */
    attachments: {
      type: [{ url: { type: String, trim: true }, name: { type: String, trim: true } }],
      default: [],
    },
    /** Token for vendor-facing view/print link (no auth); generated on first "Send to Vendor" */
    vendorShareToken: { type: String, default: undefined, trim: true },
    /** Shop that owns this PO (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
    /** Import metadata for external system linking */
    sourceSystem: { type: String, default: "", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ createdByEmail: 1, createdAt: -1 });
purchaseOrderSchema.index({ createdByEmail: 1, poNumber: 1 }, { unique: true, sparse: true });
purchaseOrderSchema.index(
  { vendorShareToken: 1 },
  { unique: true, partialFilterExpression: { vendorShareToken: { $gt: "" } } }
);
purchaseOrderSchema.index({ createdByEmail: 1, vendorId: 1 });
purchaseOrderSchema.index({ createdByEmail: 1, quoteId: 1 });
purchaseOrderSchema.index({ createdByEmail: 1, repairFlowJobId: 1 });
purchaseOrderSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $gt: "" } } }
);

if (mongoose.models.PurchaseOrder && !mongoose.models.PurchaseOrder.schema.paths.otherCharges) {
  delete mongoose.models.PurchaseOrder;
}

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", purchaseOrderSchema);
