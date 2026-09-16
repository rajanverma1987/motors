import mongoose from "mongoose";

const ACTIVITY_TYPES = [
  "lubrication",
  "vibration_check",
  "insulation_resistance",
  "thermal_scan",
  "alignment",
  "cleaning",
  "inspection",
  "other",
];

/**
 * IQMotorTrack maintenance log (§6.8) — a log with due dates, not a scheduling engine.
 */
const trackMaintenanceLogSchema = new mongoose.Schema(
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
    activityType: { type: String, enum: ACTIVITY_TYPES, required: true },
    performedAt: { type: Date, required: true },
    performedBy: { type: String, default: "", trim: true, maxlength: 120 },
    /** Chartable readings (§6.8). Blank string when not measured. */
    insulationResistanceMohm: { type: String, default: "", trim: true, maxlength: 40 },
    vibrationInPerSec: { type: String, default: "", trim: true, maxlength: 40 },
    temperatureF: { type: String, default: "", trim: true, maxlength: 40 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    attachments: { type: [String], default: [] },
    nextDueAt: { type: Date, default: null },
  },
  { timestamps: true }
);

trackMaintenanceLogSchema.index({ motorId: 1, performedAt: -1 });
trackMaintenanceLogSchema.index({ facilityId: 1, nextDueAt: 1 });
trackMaintenanceLogSchema.index({ motorId: 1, activityType: 1, performedAt: -1 });

export const TRACK_MAINTENANCE_ACTIVITY_TYPES = ACTIVITY_TYPES;

export default mongoose.models.TrackMaintenanceLog ||
  mongoose.model("TrackMaintenanceLog", trackMaintenanceLogSchema);
