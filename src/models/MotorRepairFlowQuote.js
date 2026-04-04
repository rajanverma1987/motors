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
  },
  { timestamps: true }
);

motorRepairFlowQuoteSchema.index({ jobId: 1, stage: 1 });
motorRepairFlowQuoteSchema.index({ createdByEmail: 1, createdAt: -1 });

export default mongoose.models.MotorRepairFlowQuote ||
  mongoose.model("MotorRepairFlowQuote", motorRepairFlowQuoteSchema);
