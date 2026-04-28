import mongoose from "mongoose";

const salesPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    bankDetail: { type: String, default: "", trim: true },
    createdByEmail: { type: String, required: true, trim: true },
    sourceSystem: { type: String, default: "manual_csv", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

salesPersonSchema.index({ createdByEmail: 1, createdAt: -1 });
salesPersonSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  {
    unique: true,
    partialFilterExpression: { externalRef: { $type: "string", $gt: "" } },
  }
);

export default mongoose.models.SalesPerson || mongoose.model("SalesPerson", salesPersonSchema);
