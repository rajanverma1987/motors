import mongoose from "mongoose";

/** Short-lived WebAuthn challenge for time clock registration / login. */
const timeClockChallengeSchema = new mongoose.Schema(
  {
    shopEmail: { type: String, required: true, trim: true, lowercase: true },
    employeeId: { type: String, default: "", trim: true },
    challenge: { type: String, required: true, trim: true },
    kind: { type: String, required: true, enum: ["registration", "authentication"], trim: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

timeClockChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
timeClockChallengeSchema.index({ shopEmail: 1, challenge: 1 });

export default mongoose.models.TimeClockChallenge ||
  mongoose.model("TimeClockChallenge", timeClockChallengeSchema);
