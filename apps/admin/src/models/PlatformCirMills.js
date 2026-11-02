import mongoose from "mongoose";
import { CIR_MILLS_UNIT_AWG, CIR_MILLS_UNIT_METRIC } from "@/lib/platform-cir-mills";

/**
 * Platform-wide wire size → circular mils catalog (shared by all SaaS shops).
 * Supports AWG and Metric (mm) units. Editable via admin.
 */
const platformCirMillsSchema = new mongoose.Schema(
  {
    /** Measurement unit: awg | metric */
    unit: {
      type: String,
      enum: [CIR_MILLS_UNIT_AWG, CIR_MILLS_UNIT_METRIC],
      default: CIR_MILLS_UNIT_AWG,
      required: true,
    },
    /** Wire size label (e.g. AWG "12.5" or Metric "1.25") */
    size: { type: String, required: true, trim: true },
    circularMills: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

platformCirMillsSchema.index({ unit: 1, size: 1 }, { unique: true });
platformCirMillsSchema.index({ unit: 1, isActive: 1, sortOrder: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.PlatformCirMills) {
  delete mongoose.models.PlatformCirMills;
}

export default mongoose.models.PlatformCirMills ??
  mongoose.model("PlatformCirMills", platformCirMillsSchema);
