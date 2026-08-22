import mongoose from "mongoose";

/**
 * Platform-wide AWG → circular mils catalog (shared by all SaaS shops).
 * Editable only via admin.
 */
const platformCirMillsSchema = new mongoose.Schema(
  {
    /** Wire size label (e.g. "12.5", "19") */
    size: { type: String, required: true, trim: true },
    circularMills: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

platformCirMillsSchema.index({ size: 1 }, { unique: true });
platformCirMillsSchema.index({ isActive: 1, sortOrder: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.PlatformCirMills) {
  delete mongoose.models.PlatformCirMills;
}

export default mongoose.models.PlatformCirMills ??
  mongoose.model("PlatformCirMills", platformCirMillsSchema);
