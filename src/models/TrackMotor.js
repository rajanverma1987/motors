import mongoose from "mongoose";

const CRITICALITY = ["critical", "important", "standard", "spare"];
const POWER_TYPES = ["AC", "DC"];
const MOTOR_STATUS = [
  "in_service",
  "down",
  "awaiting_proposals",
  "under_repair",
  "repaired",
  "spare",
  "retired",
];

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 160 },
    url: { type: String, default: "", trim: true },
    kind: {
      type: String,
      enum: ["test_report", "warranty", "invoice", "manual", "other"],
      default: "other",
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

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
    phase: { type: String, default: "", trim: true, maxlength: 30 },
    hz: { type: String, default: "", trim: true, maxlength: 20 },
    poles: { type: String, default: "", trim: true, maxlength: 20 },
    frame: { type: String, default: "", trim: true, maxlength: 60 },
    enclosure: { type: String, default: "", trim: true, maxlength: 60 },
    insulationClass: { type: String, default: "", trim: true, maxlength: 30 },
    serviceFactor: { type: String, default: "", trim: true, maxlength: 30 },
    nemaDesign: { type: String, default: "", trim: true, maxlength: 20 },
    bearingDE: { type: String, default: "", trim: true, maxlength: 60 },
    bearingODE: { type: String, default: "", trim: true, maxlength: 60 },
    /** §6.3 step 3 - required free text location, e.g. "Building A, Line 3". */
    facilityLocation: { type: String, default: "", trim: true, maxlength: 240 },
    locationBuilding: { type: String, default: "", trim: true, maxlength: 120 },
    locationArea: { type: String, default: "", trim: true, maxlength: 120 },
    locationAssetTag: { type: String, default: "", trim: true, maxlength: 80 },
    application: { type: String, default: "", trim: true, maxlength: 120 },
    installDate: { type: Date, default: null },
    criticality: { type: String, enum: CRITICALITY, default: "standard" },
    status: { type: String, enum: MOTOR_STATUS, default: "in_service" },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    nameplatePhotoUrl: { type: String, default: "", trim: true },
    motorPhotoUrl: { type: String, default: "", trim: true },
    extraPhotoUrls: { type: [String], default: [] },
    documents: { type: [documentSchema], default: [] },
    archived: { type: Boolean, default: false },
    lastMaintenanceAt: { type: Date, default: null },
    nextMaintenanceDue: { type: Date, default: null },
    /** Open RFQ Request (one at a time per motor). */
    openRfqId: { type: mongoose.Schema.Types.ObjectId, ref: "TrackRfqRequest", default: null },
    /** Shop currently holding the motor after an award. */
    currentShopName: { type: String, default: "", trim: true, maxlength: 160 },
    currentShopListingId: { type: String, default: "", trim: true },
    /** Latest datasheet version number (0 = no datasheet yet). */
    datasheetVersion: { type: Number, default: 0 },
    /** Set when a shop wrote back a datasheet whose power type conflicts (§9.8). */
    datasheetReviewFlag: { type: String, default: "", trim: true, maxlength: 300 },
    lifetimeRepairCount: { type: Number, default: 0 },
    lifetimeRepairCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

trackMotorSchema.index({ facilityId: 1, archived: 1, updatedAt: -1 });
trackMotorSchema.index({ facilityId: 1, serialNumber: 1 });
trackMotorSchema.index({ facilityId: 1, status: 1 });
trackMotorSchema.index({ facilityId: 1, nextMaintenanceDue: 1 });

export const TRACK_MOTOR_CRITICALITY = CRITICALITY;
export const TRACK_MOTOR_POWER_TYPES = POWER_TYPES;
export const TRACK_MOTOR_STATUS = MOTOR_STATUS;

export default mongoose.models.TrackMotor || mongoose.model("TrackMotor", trackMotorSchema);
