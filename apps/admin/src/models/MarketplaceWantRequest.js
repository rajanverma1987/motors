import mongoose from "mongoose";

/**
 * Buyer submitted when public marketplace search returns no listings.
 * Admins review in /admin/marketplace → Want requests.
 */
const marketplaceWantRequestSchema = new mongoose.Schema(
  {
    buyerName: { type: String, required: true, trim: true },
    buyerEmail: { type: String, required: true, trim: true, lowercase: true },
    buyerPhone: { type: String, default: "", trim: true },
    /** What they need (parts, motor specs, qty, timeline, etc.) */
    requirements: { type: String, required: true, trim: true, maxlength: 8000 },
    /** Search filters at time of submit (for context) */
    searchQuery: { type: String, default: "", trim: true },
    categoryFilter: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["new", "reviewing", "contacted", "closed"],
      default: "new",
      index: true,
    },
    source: { type: String, default: "marketplace_empty", trim: true },
  },
  { timestamps: true }
);

marketplaceWantRequestSchema.index({ createdAt: -1 });

export default mongoose.models.MarketplaceWantRequest ||
  mongoose.model("MarketplaceWantRequest", marketplaceWantRequestSchema);
