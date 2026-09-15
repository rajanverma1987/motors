import mongoose from "mongoose";

const SUB_STATUSES = ["free", "active", "cancelled", "past_due", "expired"];

/**
 * IQMotorTrack facility account (plant / facility owner).
 * Separate from shop CRM users and IQWireCalculator accounts.
 */
const trackFacilitySchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    facilityName: { type: String, required: true, trim: true, maxlength: 160 },
    contactName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    address: { type: String, default: "", trim: true, maxlength: 240 },
    city: { type: String, default: "", trim: true, maxlength: 80 },
    state: { type: String, default: "", trim: true, maxlength: 80 },
    postalCode: { type: String, default: "", trim: true, maxlength: 30 },
    country: { type: String, default: "", trim: true, maxlength: 80 },
    countryCode: { type: String, default: "", trim: true, uppercase: true, maxlength: 2 },
    emailVerified: { type: Boolean, default: true },
    canLogin: { type: Boolean, default: true },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    subscriptionStatus: { type: String, enum: SUB_STATUSES, default: "free" },
    paypalSubscriptionId: { type: String, default: "", index: true },
    paypalPlanId: { type: String, default: "" },
    paypalCheckoutToken: { type: String, default: "", index: true },
    paypalCheckoutTokenExpiresAt: { type: Date, default: null },
    currentPeriodEndsAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    lastPaymentAt: { type: Date, default: null },
    lastPaymentFailedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

trackFacilitySchema.index({ subscriptionStatus: 1, plan: 1 });

export const TRACK_SUB_STATUSES = SUB_STATUSES;

export default mongoose.models.TrackFacility || mongoose.model("TrackFacility", trackFacilitySchema);
