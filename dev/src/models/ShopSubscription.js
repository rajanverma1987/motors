import mongoose from "mongoose";
/** Ensures SubscriptionPlan is registered before populate("planId") / pendingPlanId. */
import "@/models/SubscriptionPlan";

/**
 * Internal subscription state (source of truth for access). PayPal webhooks keep this in sync.
 * active, trialing, past_due, suspended, cancelled
 */
const shopSubscriptionSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    internalState: {
      type: String,
      enum: ["active", "trialing", "past_due", "suspended", "cancelled"],
      default: "active",
    },
    paypalSubscriptionId: { type: String, default: "" },
    /** Snapshot when assigned (negotiated amount reference) */
    customPriceSnapshot: { type: Number, default: 0 },
    currencySnapshot: { type: String, default: "USD" },
    nextBillingTime: { type: Date },
    /** Grace after failed payment (e.g. 7 days from first failure) */
    gracePeriodEndsAt: { type: Date },
    paymentFailureCount: { type: Number, default: 0 },
    /** Free Ultimate / manual revoke — blocks login with reason */
    revokedAt: { type: Date },
    revokedReason: { type: String, default: "" },
    /** Client completes PayPal approval */
    pendingApprovalUrl: { type: String, default: "" },
    /** When switching plans: cancel this PayPal sub after new one activates */
    previousPaypalSubscriptionId: { type: String, default: "" },
    /** Optional effective date for scheduled downgrade (future use) */
    pendingPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
    featureFlags: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: "" },
    lastWebhookEventId: { type: String, default: "" },
  },
  { timestamps: true }
);

shopSubscriptionSchema.index({ internalState: 1 });
shopSubscriptionSchema.index({ paypalSubscriptionId: 1 }, { sparse: true });

export default mongoose.models.ShopSubscription || mongoose.model("ShopSubscription", shopSubscriptionSchema);
