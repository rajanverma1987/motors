import mongoose from "mongoose";

const integrationWebhookDeliverySchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    webhookId: { type: String, required: true, trim: true, index: true },
    eventName: { type: String, required: true, trim: true, index: true },
    resourceCollection: { type: String, default: "", trim: true },
    resourceId: { type: String, default: "", trim: true },
    requestId: { type: String, default: "", trim: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    httpStatusCode: { type: Number, default: null },
    attempts: { type: Number, default: 1 },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

integrationWebhookDeliverySchema.index({ ownerEmail: 1, createdAt: -1 });
integrationWebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });

export default mongoose.models.IntegrationWebhookDelivery
  || mongoose.model("IntegrationWebhookDelivery", integrationWebhookDeliverySchema);
