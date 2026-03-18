import mongoose from "mongoose";

/**
 * Per-account dashboard preferences (keyed by portal user email).
 * `settings` is a plain object; known keys are validated in the API — add new keys there as you extend the UI.
 */
const userSettingsSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

userSettingsSchema.index({ ownerEmail: 1 });

export default mongoose.models.UserSettings || mongoose.model("UserSettings", userSettingsSchema);
