import mongoose from "mongoose";

/**
 * Calculator paywall entitlement tied to portal account email (ownerEmail).
 * Single-use credits ($5) or monthly subscription (PayPal).
 */
const calculatorEntitlementSchema = new mongoose.Schema(
  {
    entitlementId: { type: String, required: true, unique: true, trim: true, index: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    credits: { type: Number, default: 0 },
    subscriptionExpiresAt: { type: Date },
    paypalSubscriptionId: { type: String, default: "", index: true },
    pendingPaypalOrderId: { type: String, default: "" },
    lastPaypalOrderId: { type: String, default: "" },
    internalState: {
      type: String,
      enum: ["none", "subscription_active", "subscription_cancelled"],
      default: "none",
    },
  },
  { timestamps: true }
);

export default mongoose.models.CalculatorEntitlement ||
  mongoose.model("CalculatorEntitlement", calculatorEntitlementSchema);
