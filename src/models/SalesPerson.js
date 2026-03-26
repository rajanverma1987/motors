import mongoose from "mongoose";

const salesPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    bankDetail: { type: String, default: "", trim: true },
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

salesPersonSchema.index({ createdByEmail: 1, createdAt: -1 });

export default mongoose.models.SalesPerson || mongoose.model("SalesPerson", salesPersonSchema);
