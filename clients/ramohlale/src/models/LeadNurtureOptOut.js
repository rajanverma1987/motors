import mongoose from "mongoose";

/**
 * Opt-out / send cooldown for post-lead 3PhaseFlow platform nurture emails
 * (directory / 3PhaseTrack leads to non-paying shops).
 */
const leadNurtureOptOutSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    optedOutAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
    lastSource: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.LeadNurtureOptOut ||
  mongoose.model("LeadNurtureOptOut", leadNurtureOptOutSchema);
