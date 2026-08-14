import mongoose from "mongoose";

const mobileSavedCalculationSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "MobileAppAccount", required: true, index: true },
    calculatorType: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    results: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

mobileSavedCalculationSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.models.MobileSavedCalculation ||
  mongoose.model("MobileSavedCalculation", mobileSavedCalculationSchema);
