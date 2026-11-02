import mongoose from "mongoose";

/** Daily rollup of public listing page views (one doc per listing per UTC day). */
const listingPageViewDailySchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    dateKey: { type: String, required: true, trim: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

listingPageViewDailySchema.index({ listingId: 1, dateKey: 1 }, { unique: true });
listingPageViewDailySchema.index({ dateKey: 1 });

export default mongoose.models.ListingPageViewDaily ||
  mongoose.model("ListingPageViewDaily", listingPageViewDailySchema);
