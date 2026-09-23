import mongoose from "mongoose";

/**
 * Manager-entered hours for a calendar day (not derived from punches).
 * Included in Hours tab / payroll totals alongside clocked punch hours.
 */
const timeClockManualHoursSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, default: "", trim: true },
    employeeNumber: { type: String, default: "", trim: true },
    /** YYYY-MM-DD work date */
    workDate: { type: String, required: true, trim: true },
    hours: { type: Number, required: true, min: 0, max: 24 },
    note: { type: String, default: "", trim: true },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, default: "", trim: true },
    createdByUserEmail: { type: String, default: "", trim: true, lowercase: true },
  },
  { timestamps: true }
);

timeClockManualHoursSchema.index({ createdByEmail: 1, workDate: -1 });
timeClockManualHoursSchema.index({ createdByEmail: 1, employeeId: 1, workDate: -1 });
timeClockManualHoursSchema.index({ createdByEmail: 1, employeeId: 1, voidedAt: 1, workDate: -1 });

export default mongoose.models.TimeClockManualHours ||
  mongoose.model("TimeClockManualHours", timeClockManualHoursSchema);
