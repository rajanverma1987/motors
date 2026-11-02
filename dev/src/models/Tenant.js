import mongoose from "mongoose";

/**
 * Platform registry row for an isolated client codebase + DB.
 * Metadata only — not shared application code.
 */
const tenantSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    host: { type: String, required: true, trim: true, lowercase: true },
    companyName: { type: String, default: "", trim: true },
    ownerEmail: { type: String, default: "", trim: true, lowercase: true },
    mongoDbName: { type: String, required: true, trim: true },
    codePath: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["provisioning", "active", "suspended", "disabled"],
      default: "provisioning",
      index: true,
    },
    /** bcrypt/scrypt hash of PLATFORM_TENANT_KEY (plaintext only in client .env) */
    platformTenantKeyHash: { type: String, default: "" },
    supportHandoffSecret: { type: String, default: "" },
    webhookUrl: { type: String, default: "" },
    dnsStatus: {
      type: String,
      enum: ["pending", "active", "skipped", "error"],
      default: "pending",
    },
    dnsError: { type: String, default: "" },
    port: { type: Number, default: null },
    suspendedAt: { type: Date, default: null },
    migratedToSlug: { type: String, default: "" },
  },
  { timestamps: true }
);

tenantSchema.index({ ownerEmail: 1 });

export default mongoose.models.Tenant || mongoose.model("Tenant", tenantSchema);
