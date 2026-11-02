import mongoose from "mongoose";

const marketplaceOrderSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceItem",
      required: true,
      index: true,
    },
    itemTitleSnapshot: { type: String, default: "", trim: true },
    itemSlugSnapshot: { type: String, default: "", trim: true },
    sellerType: { type: String, enum: ["shop", "platform"], required: true },
    /** Shop that should fulfill (shop orders only) */
    shopOwnerEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerEmail: { type: String, required: true, trim: true, lowercase: true },
    buyerPhone: { type: String, default: "", trim: true },
    buyerMessage: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

marketplaceOrderSchema.index({ createdAt: -1 });

export default mongoose.models.MarketplaceOrder ||
  mongoose.model("MarketplaceOrder", marketplaceOrderSchema);
