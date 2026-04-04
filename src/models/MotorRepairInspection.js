import mongoose from "mongoose";

/**
 * Component-level inspection for new repair flow (preliminary vs post-disassembly detailed).
 */
const motorRepairInspectionSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, trim: true },
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
  },
  { timestamps: true }
);

motorRepairInspectionSchema.index({ jobId: 1, createdAt: -1 });
motorRepairInspectionSchema.index({ createdByEmail: 1, jobId: 1 });

export default mongoose.models.MotorRepairInspection ||
  mongoose.model("MotorRepairInspection", motorRepairInspectionSchema);
