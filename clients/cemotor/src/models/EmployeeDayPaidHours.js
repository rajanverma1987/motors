import mongoose from "mongoose";

/**
 * Hours marked paid on one calendar day without a payroll payment.
 * These hours are left out of that day's unpaid total. They do not create a payment.
 */
const employeeDayPaidHoursSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    employeeId: { type: String, required: true, trim: true },
    /** YYYY-MM-DD */
    workDate: { type: String, required: true, trim: true },
    paidHours: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

employeeDayPaidHoursSchema.index(
  { createdByEmail: 1, employeeId: 1, workDate: 1 },
  { unique: true }
);

export default mongoose.models.EmployeeDayPaidHours ||
  mongoose.model("EmployeeDayPaidHours", employeeDayPaidHoursSchema);
