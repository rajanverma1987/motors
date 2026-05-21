import mongoose from "mongoose";

/**
 * Component-level inspection for new repair flow (preliminary vs post-disassembly detailed).
 */
const motorRepairInspectionSchema = new mongoose.Schema(
  {
    /** Legacy Job Write-Up repair job id */
    jobId: { type: String, default: "", trim: true },
    /** Work order this inspection belongs to */
    workOrderId: { type: String, default: "", trim: true },
    jobSourceSystem: { type: String, default: "", trim: true },
    jobExternalRef: { type: String, default: "", trim: true },
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    kind: {
      type: String,
      enum: ["preliminary", "detailed"],
      required: true,
    },
    component: {
      type: String,
      enum: ["stator", "rotor", "field_frame", "armature", "full_motor"],
      required: true,
    },
    /** Extensible findings (insulation, rotation, damage, notes, etc.) */
    findings: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Import metadata for external system linking */
    sourceSystem: { type: String, default: "", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

motorRepairInspectionSchema.index({ jobId: 1, createdAt: -1 });
motorRepairInspectionSchema.index({ workOrderId: 1, createdAt: -1 });
motorRepairInspectionSchema.index({ createdByEmail: 1, jobId: 1 });
motorRepairInspectionSchema.index({ createdByEmail: 1, workOrderId: 1 });
motorRepairInspectionSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $gt: "" } } }
);

export default mongoose.models.MotorRepairInspection ||
  mongoose.model("MotorRepairInspection", motorRepairInspectionSchema);
