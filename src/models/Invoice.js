import mongoose from "mongoose";

/** Invoice created from a quote; layout mirrors quote. invoiceNumber = RFQ number. */
const invoiceSchema = new mongoose.Schema(
  {
    quoteId: { type: String, required: true, trim: true },
    customerId: { type: String, required: true, trim: true },
    motorId: { type: String, required: true, trim: true },
    /** Same as quote RFQ# (per product requirement) */
    invoiceNumber: { type: String, required: true, trim: true },
    rfqNumber: { type: String, default: "", trim: true },
    customerPo: { type: String, default: "", trim: true },
    date: { type: String, default: "", trim: true },
    preparedBy: { type: String, default: "", trim: true },
    scopeLines: {
      type: [{ scope: String, price: String }],
      default: [],
    },
    partsLines: {
      type: [{ item: String, qty: String, uom: String, price: String }],
      default: [],
    },
    laborTotal: { type: String, default: "" },
    partsTotal: { type: String, default: "" },
    estimatedCompletion: { type: String, default: "", trim: true },
    customerNotes: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    status: { type: String, default: "draft", trim: true },
    /** Manual payment records (accounts receivable). */
    payments: {
      type: [
        {
          amount: { type: String, required: true, trim: true },
          paymentDate: { type: String, required: true, trim: true },
          method: { type: String, default: "", trim: true },
          reference: { type: String, default: "", trim: true },
          notes: { type: String, default: "", trim: true },
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
    /** Secret token for customer view/print link (set on first Send to customer) */
    customerViewToken: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ createdByEmail: 1, quoteId: 1 }, { unique: true });
invoiceSchema.index({ createdByEmail: 1, createdAt: -1 });
invoiceSchema.index({ customerViewToken: 1 }, { unique: true, sparse: true });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
