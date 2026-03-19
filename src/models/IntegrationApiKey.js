import mongoose from "mongoose";

const integrationApiKeySchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    keyPrefix: { type: String, required: true, trim: true, index: true },
    keyHash: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
    scopes: { type: [String], default: ["*"] },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

integrationApiKeySchema.index({ ownerEmail: 1, createdAt: -1 });
integrationApiKeySchema.index({ keyPrefix: 1, active: 1 });

export default mongoose.models.IntegrationApiKey
  || mongoose.model("IntegrationApiKey", integrationApiKeySchema);
