import mongoose from "mongoose";

const locationPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    metaDescription: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    zip: { type: String, default: "", trim: true },
    status: { type: String, enum: ["active", "draft"], default: "active" },
  },
  { timestamps: true }
);

locationPageSchema.index({ slug: 1 });
locationPageSchema.index({ status: 1 });
locationPageSchema.index({ city: 1, state: 1, status: 1 });

export default mongoose.models.LocationPage || mongoose.model("LocationPage", locationPageSchema);
