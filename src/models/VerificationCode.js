import mongoose from "mongoose";

const verificationCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

verificationCodeSchema.index({ email: 1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.VerificationCode || mongoose.model("VerificationCode", verificationCodeSchema);
