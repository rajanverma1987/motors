import mongoose from "mongoose";

/** Keep in sync with `@/lib/listing-marketing-constants`. */
export const LISTING_MARKETING_TEMPLATE_KEYS = [
  "initial",
  "followup1",
  "followup2",
  "followup3",
  "restart",
  "demo",
];

const eventLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const listingMarketingEmailSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    cycleId: { type: Number, default: 1 },
    templateKey: {
      type: String,
      required: true,
      enum: LISTING_MARKETING_TEMPLATE_KEYS,
    },
    to: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, default: "" },
    html: { type: String, default: "" },
    sentAt: { type: Date, default: Date.now, index: true },
    /** Resend email id (data.email_id from webhooks). */
    resendId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
    error: { type: String, default: "" },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },
    bouncedAt: { type: Date, default: null },
    complainedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    delayedAt: { type: Date, default: null },
    suppressedAt: { type: Date, default: null },
    lastEventType: { type: String, default: "" },
    lastEventAt: { type: Date, default: null },
    bounceType: { type: String, default: "" },
    bounceMessage: { type: String, default: "" },
    clickCount: { type: Number, default: 0 },
    /** Private /watch-demo token. Omitted unless this send is the demo video. */
    watchToken: { type: String },
    demoPageOpenedAt: { type: Date, default: null },
    demoPlayedAt: { type: Date, default: null },
    demoMaxPercent: { type: Number, default: 0 },
    demoCompletedAt: { type: Date, default: null },
    demoBookClickedAt: { type: Date, default: null },
    events: { type: [eventLogSchema], default: [] },
  },
  { timestamps: true }
);

listingMarketingEmailSchema.index({ listingId: 1, sentAt: -1 });
listingMarketingEmailSchema.index({ resendId: 1 }, { sparse: true });
listingMarketingEmailSchema.index({ watchToken: 1 }, { unique: true, sparse: true });

export default mongoose.models.ListingMarketingEmail ||
  mongoose.model("ListingMarketingEmail", listingMarketingEmailSchema);
