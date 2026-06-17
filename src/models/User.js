import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    shopName: { type: String, default: "", trim: true },
    contactName: { type: String, default: "", trim: true },
    canLogin: { type: Boolean, default: true },
    /**
     * Admin-created directory listing account: limited CRM (leads/customers caps) until upgraded to full subscription.
     * Self-registered users have this false.
     */
    listingOnlyAccount: { type: Boolean, default: false },
    /** Signup from calculators marketing: calculators-only portal until CalculatorEntitlement is active. */
    calculatorOnlyAccount: { type: Boolean, default: false },
    /** Last successful portal sign-in (owner or employee session for this shop). */
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ lastLoginAt: -1 });

/* email: unique: true already creates an index */

export default mongoose.models.User || mongoose.model("User", userSchema);
