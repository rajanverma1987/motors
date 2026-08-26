import mongoose from "mongoose";

const SecurityAuditLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true },
    actorEmail: { type: String, default: "", index: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    path: { type: String, default: "" },
    success: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

SecurityAuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.SecurityAuditLog ||
  mongoose.model("SecurityAuditLog", SecurityAuditLogSchema);
