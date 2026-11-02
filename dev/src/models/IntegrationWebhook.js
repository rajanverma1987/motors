import mongoose from "mongoose";

const integrationWebhookSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    endpointUrl: { type: String, required: true, trim: true },
    secret: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
    /** "*" = all events, or explicit list: crm.customers.created */
    events: { type: [String], default: ["*"] },
    lastDeliveredAt: { type: Date, default: null },
    lastStatusCode: { type: Number, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

integrationWebhookSchema.index({ ownerEmail: 1, createdAt: -1 });
integrationWebhookSchema.index({ ownerEmail: 1, active: 1 });

export default mongoose.models.IntegrationWebhook
  || mongoose.model("IntegrationWebhook", integrationWebhookSchema);
