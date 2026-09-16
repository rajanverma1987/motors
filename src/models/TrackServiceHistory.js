import mongoose from "mongoose";

const WORK_TYPES = [
  "rewind",
  "bearing_replacement",
  "mechanical",
  "testing",
  "field_service",
  "other",
];

/**
 * IQMotorTrack service history (§6.7). Entries are created automatically from
 * IQMotorBase job events, or manually for work done outside the platform.
 */
const trackServiceHistorySchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackFacility",
      required: true,
      index: true,
    },
    motorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackMotor",
      required: true,
      index: true,
    },
    completedAt: { type: Date, default: null },
    shopName: { type: String, default: "", trim: true, maxlength: 160 },
    shopListingId: { type: String, default: "", trim: true },
    jobNumber: { type: String, default: "", trim: true, maxlength: 80 },
    invoiceNumber: { type: String, default: "", trim: true, maxlength: 80 },
    invoicedAt: { type: Date, default: null },
    workType: { type: String, enum: WORK_TYPES, default: "other" },
    description: { type: String, default: "", trim: true, maxlength: 4000 },
    finalCost: { type: Number, default: null },
    currency: { type: String, default: "USD", trim: true, uppercase: true, maxlength: 3 },
    /** Where finalCost came from: invoice total, awarded proposal price, or manual entry. */
    costSource: {
      type: String,
      enum: ["invoice", "awarded_proposal", "manual", ""],
      default: "",
    },
    turnaroundDays: { type: Number, default: null },
    failureCause: { type: String, default: "", trim: true, maxlength: 1000 },
    testReportUrl: { type: String, default: "", trim: true },
    attachments: { type: [String], default: [] },
    warrantyMonths: { type: Number, default: null },
    warrantyExpiresAt: { type: Date, default: null },
    rfqRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackRfqRequest",
      default: null,
      index: true,
    },
    proposalId: { type: String, default: "", trim: true },
    source: { type: String, enum: ["manual", "iqmotorbase"], default: "manual" },
  },
  { timestamps: true }
);

trackServiceHistorySchema.index({ motorId: 1, completedAt: -1 });
trackServiceHistorySchema.index({ facilityId: 1, completedAt: -1 });
trackServiceHistorySchema.index(
  { rfqRequestId: 1, proposalId: 1 },
  { partialFilterExpression: { proposalId: { $gt: "" } } }
);

export const TRACK_WORK_TYPES = WORK_TYPES;

export default mongoose.models.TrackServiceHistory ||
  mongoose.model("TrackServiceHistory", trackServiceHistorySchema);
