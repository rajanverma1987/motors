import mongoose from "mongoose";

/** Audit trail for payments and adjustments. */
const subscriptionTransactionSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    paypalSubscriptionId: { type: String, default: "" },
    paypalSaleId: { type: String, default: "" },
    paypalEventId: { type: String, default: "" },
    type: {
      type: String,
      enum: ["payment", "refund", "adjustment", "webhook", "admin_override", "offline_marked_paid"],
      default: "payment",
    },
    amount: { type: Number },
    currency: { type: String, default: "USD" },
    status: { type: String, default: "" },
    description: { type: String, default: "" },
    /** Admin email for overrides */
    performedBy: { type: String, default: "" },
    rawEventSummary: { type: String, default: "" },
  },
  { timestamps: true }
);

subscriptionTransactionSchema.index({ createdAt: -1 });
subscriptionTransactionSchema.index({ paypalEventId: 1 }, { sparse: true });

export default mongoose.models.SubscriptionTransaction
  || mongoose.model("SubscriptionTransaction", subscriptionTransactionSchema);
