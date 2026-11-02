import mongoose from "mongoose";

const wireSizeSchema = new mongoose.Schema(
  {
    /** Shop owner email — tenant scope (same as other CRM models) */
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    size: { type: String, required: true, trim: true },
    circularMills: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

wireSizeSchema.index({ createdByEmail: 1, isActive: 1 });
wireSizeSchema.index({ createdByEmail: 1, size: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.WireSize) {
  delete mongoose.models.WireSize;
}

export default mongoose.models.WireSize ?? mongoose.model("WireSize", wireSizeSchema);
