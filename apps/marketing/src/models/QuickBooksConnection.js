import mongoose from "mongoose";

/**
 * Per-shop QuickBooks Online OAuth connection.
 * Tokens are server-only — never returned to the client.
 */
const quickBooksConnectionSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    realmId: { type: String, required: true, trim: true },
    companyName: { type: String, default: "", trim: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    connectedAt: { type: Date, default: Date.now },
    disconnectedAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

quickBooksConnectionSchema.index({ ownerEmail: 1, active: 1 });

export default mongoose.models.QuickBooksConnection ||
  mongoose.model("QuickBooksConnection", quickBooksConnectionSchema);
