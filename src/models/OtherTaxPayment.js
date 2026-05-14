import mongoose from "mongoose";

/** Manual non-invoice / non-PO tax payments (e.g. sales tax remittance, payroll tax). Mirrored to ledger. */
const otherTaxPaymentSchema = new mongoose.Schema(
  {
    taxType: { type: String, required: true, trim: true, maxlength: 120 },
    taxPeriod: { type: String, default: "", trim: true, maxlength: 80 },
    paidDate: { type: String, required: true, trim: true },
    paidAmount: { type: String, required: true, trim: true },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

otherTaxPaymentSchema.index({ createdByEmail: 1, paidDate: -1, createdAt: -1 });

export default mongoose.models.OtherTaxPayment ||
  mongoose.model("OtherTaxPayment", otherTaxPaymentSchema);
