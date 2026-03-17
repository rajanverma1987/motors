import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    /** Customer id (dashboard Customer) */
    customerId: { type: String, required: true, trim: true },
    /** Motor asset id */
    motorId: { type: String, required: true, trim: true },
    /** Optional: lead this quote was created from */
    leadId: { type: String, default: "", trim: true },
    /** draft | sent | approved | rejected | rnr (Return No Repair) */
    status: { type: String, default: "draft", trim: true },
    /** Customer PO number */
    customerPo: { type: String, default: "", trim: true },
    /** Quote date (e.g. YYYY-MM-DD) */
    date: { type: String, default: "", trim: true },
    /** Prepared by: employee id or name */
    preparedBy: { type: String, default: "", trim: true },
    /** Auto-generated RFQ number: A00001, A00002, ... */
    rfqNumber: { type: String, default: "", trim: true },
    /** Legacy single-line scope; kept for backward compat */
    repairScope: { type: String, default: "", trim: true },
    laborTotal: { type: String, default: "", trim: true },
    partsTotal: { type: String, default: "", trim: true },
    /** Scope line items: description + price (labor) */
    scopeLines: [{
      scope: { type: String, default: "", trim: true },
      price: { type: String, default: "", trim: true },
    }],
    /** Parts/Other Cost line items: item, qty, uom (unit e.g. kg, lbs), price (unit price). Total = qty * price */
    partsLines: [{
      item: { type: String, default: "", trim: true },
      qty: { type: String, default: "1", trim: true },
      uom: { type: String, default: "", trim: true },
      price: { type: String, default: "", trim: true },
    }],
    estimatedCompletion: { type: String, default: "", trim: true },
    /** Client-facing notes: shown on proposal and invoice sent to customer */
    customerNotes: { type: String, default: "", trim: true },
    /** Internal notes: for repair company reference only */
    notes: { type: String, default: "", trim: true },
    /** Attachments linked to this RFQ (url + display name) */
    attachments: {
      type: [{
        url: { type: String, required: true, trim: true },
        name: { type: String, default: "", trim: true },
      }],
      default: [],
    },
    /** Token for customer approve/reject link (public URL) */
    respondToken: { type: String, default: "", trim: true },
    /** When the customer approved or rejected via the respond link */
    respondedAt: { type: Date, default: null },
    /** Log of status changes: { from, to, at, by } */
    statusLog: {
      type: [{
        from: { type: String, default: "", trim: true },
        to: { type: String, default: "", trim: true },
        at: { type: Date, required: true },
        by: { type: String, default: "", trim: true },
      }],
      default: [],
    },
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

quoteSchema.index({ createdByEmail: 1, createdAt: -1 });
quoteSchema.index({ createdByEmail: 1, customerId: 1 });
quoteSchema.index({ respondToken: 1 }, { sparse: true });

export default mongoose.models.Quote || mongoose.model("Quote", quoteSchema);
