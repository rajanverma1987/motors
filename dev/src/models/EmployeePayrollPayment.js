import mongoose from "mongoose";

/**
 * Recorded wage payout for one employee (Simple portal).
 * Hourly employees can have more than one payment. Each one stores the hours paid
 * and the unpaid balance at that moment (`hoursDue`) so the next balance can start over.
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
    /** Hours the user confirmed as paid. */
    hours: { type: Number, default: 0 },
    /** Unpaid hourly balance at payment time, before subtracting `hours`. Null on older rows. */
    hoursDue: { type: Number, default: null },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["paid"], default: "paid" },
    paidAt: { type: Date, default: null },
    /** How the payroll was paid (Check, ACH, Cash, etc.) */
    paymentMethod: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    attachments: {
      type: [{ url: { type: String, trim: true }, name: { type: String, trim: true } }],
      default: [],
    },
  },
  { timestamps: true }
);

employeePayrollPaymentSchema.index({ createdByEmail: 1, employeeId: 1, paidAt: -1 });
employeePayrollPaymentSchema.index({ createdByEmail: 1, periodMonth: 1, paidAt: -1 });

export default mongoose.models.EmployeePayrollPayment ||
  mongoose.model("EmployeePayrollPayment", employeePayrollPaymentSchema);
