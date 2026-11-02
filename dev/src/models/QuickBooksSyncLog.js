import mongoose from "mongoose";

/**
 * Audit log for QuickBooks Online sync attempts (success and error).
 */
const quickBooksSyncLogSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    entityType: {
      type: String,
      required: true,
      trim: true,
      enum: ["customer", "vendor", "invoice", "payment", "vendorPo"],
    },
    localId: { type: String, default: "", trim: true },
    quickBooksId: { type: String, default: "", trim: true },
    action: { type: String, default: "create", trim: true, enum: ["create", "update"] },
    status: { type: String, required: true, trim: true, enum: ["success", "error"] },
    message: { type: String, default: "", trim: true },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

quickBooksSyncLogSchema.index({ ownerEmail: 1, occurredAt: -1 });
quickBooksSyncLogSchema.index({ ownerEmail: 1, entityType: 1, localId: 1, occurredAt: -1 });

export default mongoose.models.QuickBooksSyncLog ||
  mongoose.model("QuickBooksSyncLog", quickBooksSyncLogSchema);
