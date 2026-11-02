import mongoose from "mongoose";

const TEMPLATE_KEYS = ["initial", "followup1", "followup2", "followup3", "restart"];

const marketingTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: TEMPLATE_KEYS,
    },
    /**
     * Legacy field. New saves set type === key so older unique indexes on `type` remain valid.
     * Historical values: initial | followup.
     */
    type: { type: String, trim: true },
    name: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    bodyHtml: { type: String, default: "" },
    /** @deprecated Prefer bodyHtml. */
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.MarketingTemplate ||
  mongoose.model("MarketingTemplate", marketingTemplateSchema);
