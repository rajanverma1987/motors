import mongoose from "mongoose";

const CRITICALITY = ["critical", "important", "standard", "spare"];
const POWER_TYPES = ["AC", "DC"];
const MOTOR_STATUS = ["in_service", "down", "under_repair", "spare", "retired"];

/**
 * IQMotorTrack motor register (plant-owned).
 */
const trackMotorSchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackFacility",
      required: true,
      index: true,
    },
    manufacturer: { type: String, required: true, trim: true, maxlength: 120 },
    modelNumber: { type: String, default: "", trim: true, maxlength: 120 },
    serialNumber: { type: String, default: "", trim: true, maxlength: 120 },
    powerType: { type: String, enum: POWER_TYPES, required: true },
    motorType: { type: String, default: "", trim: true, maxlength: 80 },
    hp: { type: String, default: "", trim: true, maxlength: 40 },
    kw: { type: String, default: "", trim: true, maxlength: 40 },
    voltage: { type: String, required: true, trim: true, maxlength: 80 },
    fullLoadAmps: { type: String, default: "", trim: true, maxlength: 40 },
    rpm: { type: String, default: "", trim: true, maxlength: 40 },
    frame: { type: String, default: "", trim: true, maxlength: 60 },
    enclosure: { type: String, default: "", trim: true, maxlength: 60 },
    locationBuilding: { type: String, default: "", trim: true, maxlength: 120 },
    locationArea: { type: String, default: "", trim: true, maxlength: 120 },
    locationAssetTag: { type: String, default: "", trim: true, maxlength: 80 },
    criticality: { type: String, enum: CRITICALITY, default: "standard" },
    status: { type: String, enum: MOTOR_STATUS, default: "in_service" },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    nameplatePhotoUrl: { type: String, default: "", trim: true },
    motorPhotoUrl: { type: String, default: "", trim: true },
    archived: { type: Boolean, default: false },
    lastMaintenanceAt: { type: Date, default: null },
    nextMaintenanceDue: { type: Date, default: null },
  },
  { timestamps: true }
);

trackMotorSchema.index({ facilityId: 1, archived: 1, updatedAt: -1 });
trackMotorSchema.index({ facilityId: 1, serialNumber: 1 });

export const TRACK_MOTOR_CRITICALITY = CRITICALITY;
export const TRACK_MOTOR_POWER_TYPES = POWER_TYPES;
export const TRACK_MOTOR_STATUS = MOTOR_STATUS;

export default mongoose.models.TrackMotor || mongoose.model("TrackMotor", trackMotorSchema);
