import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    subjectToTeardown: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Preliminary or final quote in the new repair flow only (not the legacy Quote model).
 */
const motorRepairFlowQuoteSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, trim: true },
    jobSourceSystem: { type: String, default: "", trim: true },
    jobExternalRef: { type: String, default: "", trim: true },
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    stage: {
      type: String,
      enum: ["preliminary", "final"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "waiting_approval", "approved", "rejected", "locked"],
      default: "draft",
    },
    lineItems: { type: [lineItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    quoteNotes: { type: String, default: "", trim: true, maxlength: 8000 },
    /** Import metadata for external system linking */
    sourceSystem: { type: String, default: "", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

motorRepairFlowQuoteSchema.index({ jobId: 1, stage: 1 });
motorRepairFlowQuoteSchema.index({ createdByEmail: 1, createdAt: -1 });
motorRepairFlowQuoteSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $gt: "" } } }
);

export default mongoose.models.MotorRepairFlowQuote ||
  mongoose.model("MotorRepairFlowQuote", motorRepairFlowQuoteSchema);
