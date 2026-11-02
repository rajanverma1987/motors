import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
  {
    date: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    party: { type: String, default: "", trim: true },
    debit: { type: String, default: "", trim: true },
    credit: { type: String, default: "", trim: true },
    receivable: { type: String, default: "", trim: true },
    payable: { type: String, default: "", trim: true },
    status: { type: String, default: "", trim: true },
    sourceType: { type: String, default: "manual", trim: true },
    sourceId: { type: String, default: "", trim: true },
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ createdByEmail: 1, date: -1, createdAt: -1 });

export default mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", ledgerEntrySchema);
