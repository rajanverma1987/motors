import mongoose from "mongoose";

/**
 * Recorded wage / payroll payout for one employee for one calendar month (Simple portal).
 */
const employeePayrollPaymentSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, default: "", trim: true },
    employeeNumber: { type: String, default: "", trim: true },
    /** Calendar month key: YYYY-MM */
    periodMonth: { type: String, required: true, trim: true },
    periodFrom: { type: String, default: "", trim: true },
    periodTo: { type: String, default: "", trim: true },
    payType: { type: String, enum: ["hourly", "salary"], default: "hourly" },
    /** Snapshot of rate / salary amount at pay time */
    hourlyRate: { type: String, default: "", trim: true },
    hours: { type: Number, default: 0 },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["paid"], default: "paid" },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    attachments: {
      type: [{ url: { type: String, trim: true }, name: { type: String, trim: true } }],
      default: [],
    },
  },
  { timestamps: true }
);

employeePayrollPaymentSchema.index(
  { createdByEmail: 1, employeeId: 1, periodMonth: 1 },
  { unique: true, name: "unique_employee_payroll_month" }
);
employeePayrollPaymentSchema.index({ createdByEmail: 1, periodMonth: 1, paidAt: -1 });

export default mongoose.models.EmployeePayrollPayment ||
  mongoose.model("EmployeePayrollPayment", employeePayrollPaymentSchema);
