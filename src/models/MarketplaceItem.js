import mongoose from "mongoose";

/** Shop-listed items (CRM) vs platform-listed (admin, commission path). */
const marketplaceItemSchema = new mongoose.Schema(
  {
    sellerType: {
      type: String,
      required: true,
      enum: ["shop", "platform"],
      index: true,
    },
    /** Shop owner email when sellerType=shop; admin marker when platform */
    createdByEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    /** Display name for shop sellers on public pages */
    shopNameSnapshot: { type: String, default: "", trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    category: {
      type: String,
      default: "other",
      trim: true,
      enum: ["parts", "motors", "tools", "surplus", "other"],
    },
    /** Shown to buyers; no payment processing */
    priceDisplay: { type: String, default: "", trim: true },
    condition: { type: String, default: "", trim: true },
    /** Up to 10 image URLs */
    images: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

marketplaceItemSchema.index({ status: 1, sellerType: 1, createdAt: -1 });
marketplaceItemSchema.index({ slug: 1 }, { unique: true });

export default mongoose.models.MarketplaceItem ||
  mongoose.model("MarketplaceItem", marketplaceItemSchema);
