import mongoose from "mongoose";

const SUB_STATUSES = ["trial", "active", "cancelled", "past_due", "expired"];

/**
 * Standalone IQWireCalculator app accounts (not shop CRM users).
 */
const mobileAppAccountSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    canLogin: { type: Boolean, default: true },
    trialStartedAt: { type: Date, default: Date.now },
    trialEndsAt: { type: Date, required: true },
    subscriptionStatus: { type: String, enum: SUB_STATUSES, default: "trial" },
    paypalSubscriptionId: { type: String, default: "", index: true },
    paypalPlanId: { type: String, default: "" },
    currentPeriodEndsAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    lastPaymentAt: { type: Date, default: null },
    lastPaymentFailedAt: { type: Date, default: null },
    graceEndsAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mobileAppAccountSchema.index({ subscriptionStatus: 1, trialEndsAt: 1 });

export const MOBILE_APP_SUB_STATUSES = SUB_STATUSES;

export default mongoose.models.MobileAppAccount ||
  mongoose.model("MobileAppAccount", mobileAppAccountSchema);
