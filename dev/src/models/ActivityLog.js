import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    actorEmail: { type: String, default: "", trim: true },
    actorName: { type: String, default: "", trim: true },
    action: { type: String, required: true, trim: true },
    recordKind: { type: String, required: true, trim: true },
    recordId: { type: String, default: "", trim: true },
    recordNumber: { type: String, default: "", trim: true },
    partyName: { type: String, default: "", trim: true },
    summary: { type: String, default: "", trim: true },
    changes: { type: Array, default: [] },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

activityLogSchema.index({ ownerEmail: 1, createdAt: -1 });
activityLogSchema.index({ ownerEmail: 1, recordNumber: 1, createdAt: -1 });
activityLogSchema.index({ ownerEmail: 1, recordKind: 1, recordId: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
