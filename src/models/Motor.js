import mongoose from "mongoose";

const motorSchema = new mongoose.Schema(
  {
    /** Customer id (dashboard Customer) this motor belongs to */
    customerId: { type: String, required: true, trim: true },
    serialNumber: { type: String, default: "", trim: true },
    manufacturer: { type: String, default: "", trim: true },
    model: { type: String, default: "", trim: true },
    hp: { type: String, default: "", trim: true },
    rpm: { type: String, default: "", trim: true },
    voltage: { type: String, default: "", trim: true },
    kw: { type: String, default: "", trim: true },
    amps: { type: String, default: "", trim: true },
    frameSize: { type: String, default: "", trim: true },
    motorType: { type: String, default: "", trim: true },
    slots: { type: String, default: "", trim: true },
    coreLength: { type: String, default: "", trim: true },
    coreDiameter: { type: String, default: "", trim: true },
    bars: { type: String, default: "", trim: true },
    /** Optional motor photos (URLs or paths) */
    motorPhotos: [{ type: String }],
    /** Optional nameplate images */
    nameplateImages: [{ type: String }],
    notes: { type: String, default: "", trim: true },
    /** Shop that owns this motor (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

motorSchema.index({ createdByEmail: 1, createdAt: -1 });
motorSchema.index({ createdByEmail: 1, customerId: 1 });

// Recompile if cached model was created before slots/kw/amps (or other new fields) were added
if (mongoose.models.Motor && !mongoose.models.Motor.schema.paths.kw) {
  delete mongoose.models.Motor;
}

export default mongoose.models.Motor || mongoose.model("Motor", motorSchema);
