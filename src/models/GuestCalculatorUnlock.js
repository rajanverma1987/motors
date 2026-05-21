import mongoose from "mongoose";

/** One-time PayPal unlock on the public cost guide (no portal account). */
const guestCalculatorUnlockSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["pending", "captured", "used"],
      default: "pending",
    },
    capturedAt: { type: Date },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.GuestCalculatorUnlock ||
  mongoose.model("GuestCalculatorUnlock", guestCalculatorUnlockSchema);
