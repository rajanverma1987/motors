import mongoose from "mongoose";

const listingMarketingStateSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      unique: true,
    },
    unsubscribedAt: { type: Date, default: null },
    /** Increments on each Restart so history stays grouped by campaign cycle. */
    cycleId: { type: Number, default: 1 },
    /**
     * Emails sent in the current cycle:
     * 0 = not contacted, 1 = initial/restart sent, 2..4 = after follow-up 1..3.
     * Auto-send stops when emailsInCycle reaches 4.
     */
    emailsInCycle: { type: Number, default: 0 },
    lastEmailSentAt: { type: Date, default: null },
    /** When true, next batch send uses the restart template. */
    awaitingRestartTemplate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

listingMarketingStateSchema.index({ unsubscribedAt: 1 });
listingMarketingStateSchema.index({ lastEmailSentAt: 1 });
listingMarketingStateSchema.index({ awaitingRestartTemplate: 1, emailsInCycle: 1 });

export default mongoose.models.ListingMarketingState ||
  mongoose.model("ListingMarketingState", listingMarketingStateSchema);
