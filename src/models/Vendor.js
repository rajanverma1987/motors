import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    zipCode: { type: String, default: "", trim: true },
    /** Parts/materials this vendor supplies: array of strings */
    partsSupplied: [{ type: String, trim: true }],
    paymentTerms: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    /** Shop that owns this vendor (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

vendorSchema.index({ createdByEmail: 1, createdAt: -1 });
vendorSchema.index({ createdByEmail: 1, name: 1 });

// Recompile if cached model had partsSupplied as String (old schema)
const existing = mongoose.models.Vendor;
if (existing && existing.schema.path("partsSupplied")?.instance !== "Array") {
  delete mongoose.models.Vendor;
}

export default mongoose.models.Vendor || mongoose.model("Vendor", vendorSchema);
