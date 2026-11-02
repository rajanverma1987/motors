import mongoose from "mongoose";

/** internal = Free Ultimate / comped; paypal = paid plan synced with PayPal billing. */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    planType: { type: String, enum: ["internal", "paypal"], required: true },
    description: { type: String, default: "" },
    /** Display / negotiation reference (USD). PayPal plan is created with this amount. */
    customPrice: { type: Number, default: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    billingCycle: { type: String, enum: ["monthly", "yearly", "custom"], default: "monthly" },
    /** For custom cycle: e.g. 3 = every 3 months */
    billingIntervalCount: { type: Number, default: 1 },
    negotiatedBy: { type: String, default: "" },
    paypalProductId: { type: String, default: "" },
    paypalPlanId: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ active: 1, planType: 1 });

export default mongoose.models.SubscriptionPlan || mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
