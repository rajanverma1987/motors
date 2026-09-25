import mongoose from "mongoose";

/**
 * Versioned datasheet on an IQMotorTrack motor (§6.5, §9.8).
 * `data` holds the IQMotorBase datasheet shape verbatim (acDatasheet / dcDatasheet keys)
 * so values round-trip losslessly between the two systems.
 */
const trackDatasheetVersionSchema = new mongoose.Schema(
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
    version: { type: Number, required: true },
    powerType: { type: String, enum: ["AC", "DC", "Pump", "Generator"], required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Per-field provenance: { "dataSheet.slots": { source, shopName, jobNumber, at, previousValue } } */
    fieldProvenance: { type: mongoose.Schema.Types.Mixed, default: {} },
    changedFields: { type: [String], default: [] },
    sourceType: { type: String, enum: ["facility", "shop"], required: true },
    sourceLabel: { type: String, default: "", trim: true, maxlength: 160 },
    shopListingId: { type: String, default: "", trim: true },
    jobNumber: { type: String, default: "", trim: true, maxlength: 80 },
    proposalId: { type: String, default: "", trim: true },
    rfqRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackRfqRequest",
      default: null,
    },
    recordedAt: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

trackDatasheetVersionSchema.index({ motorId: 1, version: -1 }, { unique: true });

export default mongoose.models.TrackDatasheetVersion ||
  mongoose.model("TrackDatasheetVersion", trackDatasheetVersionSchema);
