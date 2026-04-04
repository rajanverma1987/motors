import mongoose from "mongoose";

/**
 * New repair pipeline (documents/newFlow.md) — separate from legacy Quote / WorkOrder.
 * Lifecycle container: intake → inspection → preliminary quote → approvals → execution → QA → done.
 */
const executionStageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "done"],
      default: "pending",
    },
    notes: { type: String, default: "", trim: true, maxlength: 8000 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const motorRepairJobSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    /** Display id e.g. RF-00042 */
    jobNumber: { type: String, required: true, trim: true },
    motorId: { type: String, required: true, trim: true },
    customerId: { type: String, required: true, trim: true },
    complaint: { type: String, default: "", trim: true, maxlength: 8000 },
    nameplateSummary: { type: String, default: "", trim: true, maxlength: 4000 },
    intakeNotes: { type: String, default: "", trim: true, maxlength: 8000 },
    intakePhotoUrls: [{ type: String, trim: true }],
    /** Files for this repair job (photos, PDFs) — same shape as CRM Quote.attachments */
    attachments: {
      type: [
        {
          url: { type: String, required: true, trim: true },
          name: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    /**
     * Pipeline phase (newFlow.md). Legacy quotes/WOs unchanged.
     */
    phase: {
      type: String,
      enum: [
        "intake",
        "pre_inspection",
        "preliminary_quote",
        "awaiting_preliminary_approval",
        "teardown_approved",
        "disassembly_detailed",
        "final_quote",
        "awaiting_final_approval",
        "work_execution",
        "testing_qa",
        "completed",
        "closed_returned",
        "closed_scrap",
      ],
      default: "intake",
    },
    preliminaryFlowQuoteId: { type: String, default: "", trim: true },
    finalFlowQuoteId: { type: String, default: "", trim: true },
    /** Unguessable token for customer preliminary decision link (unset until first send; never exposed in dashboard JSON). */
    preliminaryRespondToken: { type: String, trim: true },
    /** Optional link to existing Invoice when generated from final flow quote */
    linkedInvoiceId: { type: String, default: "", trim: true },
    executionStages: { type: [executionStageSchema], default: [] },
    qaPassed: { type: Boolean, default: null },
    qaNotes: { type: String, default: "", trim: true, maxlength: 4000 },
    finalTestSummary: { type: String, default: "", trim: true, maxlength: 8000 },
  },
  { timestamps: true }
);

motorRepairJobSchema.index({ createdByEmail: 1, createdAt: -1 });
motorRepairJobSchema.index(
  { createdByEmail: 1, jobNumber: 1 },
  { unique: true }
);
motorRepairJobSchema.index({ createdByEmail: 1, motorId: 1 });
motorRepairJobSchema.index({ createdByEmail: 1, customerId: 1 });
motorRepairJobSchema.index({ preliminaryRespondToken: 1 }, { unique: true, sparse: true });

export default mongoose.models.MotorRepairJob || mongoose.model("MotorRepairJob", motorRepairJobSchema);
