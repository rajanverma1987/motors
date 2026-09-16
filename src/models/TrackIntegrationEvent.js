import mongoose from "mongoose";

const EVENT_TYPES = [
  "rfq_sent",
  "rfq_updated",
  "rfq_cancelled",
  "lead_viewed",
  "converted_to_proposal",
  "proposal_sent",
  "proposal_revised",
  "declined_to_quote",
  "awarded",
  "not_selected",
  "datasheet_saved",
  "job_status_changed",
  "job_completed",
  "invoice_issued",
];

const STATUSES = ["pending", "delivered", "failed", "skipped"];

/**
 * Integration delivery log for IQMotorTrack <-> IQMotorBase (§9.1, §14.11).
 * `idempotencyKey` is unique so replaying an event never duplicates work.
 */
const trackIntegrationEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    direction: { type: String, enum: ["track_to_base", "base_to_track"], required: true },
    idempotencyKey: { type: String, required: true, trim: true, unique: true },
    status: { type: String, enum: STATUSES, default: "pending", index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "", trim: true, maxlength: 1000 },
    nextAttemptAt: { type: Date, default: null, index: true },
    deliveredAt: { type: Date, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    facilityId: { type: String, default: "", trim: true },
    rfqRequestId: { type: String, default: "", trim: true, index: true },
    invitationId: { type: String, default: "", trim: true },
    motorId: { type: String, default: "", trim: true },
    listingId: { type: String, default: "", trim: true },
    leadId: { type: String, default: "", trim: true },
    proposalId: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

trackIntegrationEventSchema.index({ createdAt: -1 });
trackIntegrationEventSchema.index({ status: 1, createdAt: -1 });

export const TRACK_EVENT_TYPES = EVENT_TYPES;
export const TRACK_EVENT_STATUSES = STATUSES;

export default mongoose.models.TrackIntegrationEvent ||
  mongoose.model("TrackIntegrationEvent", trackIntegrationEventSchema);
