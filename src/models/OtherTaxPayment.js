import mongoose from "mongoose";

/** Manual tax remittances (e.g. sales tax to government). Mirrored to ledger. */
const otherTaxPaymentSchema = new mongoose.Schema(
  {
    taxType: { type: String, required: true, trim: true, maxlength: 120 },
    taxPeriod: { type: String, default: "", trim: true, maxlength: 80 },
    paidDate: { type: String, required: true, trim: true },
    paidAmount: { type: String, required: true, trim: true },
    method: { type: String, default: "", trim: true, maxlength: 80 },
    paidBy: { type: String, default: "", trim: true, maxlength: 120 },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    /** Simple invoice / job ids covered by this period-batch remittance. */
    proposalIds: { type: [String], default: [] },
    from: { type: String, default: "", trim: true, maxlength: 10 },
    to: { type: String, default: "", trim: true, maxlength: 10 },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

otherTaxPaymentSchema.index({ createdByEmail: 1, paidDate: -1, createdAt: -1 });

export default mongoose.models.OtherTaxPayment ||
  mongoose.model("OtherTaxPayment", otherTaxPaymentSchema);
