import mongoose from "mongoose";

/**
 * Blank diagram designs for technician drawing on jobs.
 * scope "platform" = admin uploads (all shops); "shop" = shop-owned templates.
 */
const diagramTemplateSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["platform", "shop"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, required: true, trim: true },
    /** Shop owner email when scope is shop; empty for platform. */
    createdByEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

diagramTemplateSchema.index({ scope: 1, isActive: 1, sortOrder: 1, name: 1 });
diagramTemplateSchema.index({ scope: 1, createdByEmail: 1, name: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.DiagramTemplate) {
  delete mongoose.models.DiagramTemplate;
}

export default mongoose.models.DiagramTemplate ??
  mongoose.model("DiagramTemplate", diagramTemplateSchema);
