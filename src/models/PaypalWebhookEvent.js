import mongoose from "mongoose";

/** Idempotent webhook processing. */
const paypalWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, default: "" },
    processedOk: { type: Boolean, default: false },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.PaypalWebhookEvent
  || mongoose.model("PaypalWebhookEvent", paypalWebhookEventSchema);
