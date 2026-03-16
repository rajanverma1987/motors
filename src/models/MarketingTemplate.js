import mongoose from "mongoose";

const marketingTemplateSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ["initial", "followup"], unique: true },
    subject: { type: String, default: "", trim: true },
    body: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.MarketingTemplate || mongoose.model("MarketingTemplate", marketingTemplateSchema);
