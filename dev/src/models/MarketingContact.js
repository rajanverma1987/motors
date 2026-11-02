import mongoose from "mongoose";

const marketingContactSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "contacted", "replied", "listed", "do_not_contact", "unsubscribed"],
      default: "pending",
    },
    firstEmailSentAt: { type: Date },
    lastEmailSentAt: { type: Date },
    followUpCount: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

marketingContactSchema.index({ status: 1 });
marketingContactSchema.index({ lastEmailSentAt: 1 });
marketingContactSchema.index({ email: 1 });

export default mongoose.models.MarketingContact || mongoose.model("MarketingContact", marketingContactSchema);
