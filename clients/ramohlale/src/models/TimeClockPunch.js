import mongoose from "mongoose";

const timeClockPunchSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, default: "", trim: true },
    employeeNumber: { type: String, default: "", trim: true },
    type: {
      type: String,
      required: true,
      enum: ["in", "out", "break_start", "break_end"],
      trim: true,
    },
    punchedAt: { type: Date, required: true, default: Date.now },
    source: {
      type: String,
      default: "qr_passkey",
      enum: ["qr_passkey", "manager_edit"],
      trim: true,
    },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    accuracyM: { type: Number, default: null },
    distanceM: { type: Number, default: null },
    userAgent: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

timeClockPunchSchema.index({ createdByEmail: 1, punchedAt: -1 });
timeClockPunchSchema.index({ createdByEmail: 1, employeeId: 1, punchedAt: -1 });
timeClockPunchSchema.index({ createdByEmail: 1, employeeId: 1, voidedAt: 1, punchedAt: -1 });

export default mongoose.models.TimeClockPunch ||
  mongoose.model("TimeClockPunch", timeClockPunchSchema);
