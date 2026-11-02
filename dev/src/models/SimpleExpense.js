import mongoose from "mongoose";

/** Shop operating expenses recorded from Simple Invoices → Record Expenses. */
const simpleExpenseSchema = new mongoose.Schema(
  {
    expenseDate: { type: String, required: true, trim: true, maxlength: 10 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    creditCardNumber: { type: String, default: "", trim: true, maxlength: 80 },
    employeeId: { type: String, default: "", trim: true, maxlength: 64 },
    employeeName: { type: String, default: "", trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

simpleExpenseSchema.index({ createdByEmail: 1, expenseDate: -1, createdAt: -1 });
simpleExpenseSchema.index({ createdByEmail: 1, category: 1, expenseDate: -1 });

export default mongoose.models.SimpleExpense || mongoose.model("SimpleExpense", simpleExpenseSchema);
