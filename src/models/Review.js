import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    authorName: { type: String, required: true, trim: true },
    authorEmail: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true, trim: true },
    status: { type: String, enum: ["approved", "pending"], default: "approved" },
    ipHash: { type: String, default: "" },
  },
  { timestamps: true }
);

reviewSchema.index({ listingId: 1, status: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
