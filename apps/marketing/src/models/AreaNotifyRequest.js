import mongoose from "mongoose";

const areaNotifyRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    zip: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

areaNotifyRequestSchema.index({ email: 1, city: 1, state: 1, zip: 1 }, { unique: true });

export default mongoose.models.AreaNotifyRequest || mongoose.model("AreaNotifyRequest", areaNotifyRequestSchema);
