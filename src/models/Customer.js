import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "", trim: true },
    primaryContactName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    zipCode: { type: String, default: "", trim: true },
    country: { type: String, default: "United States", trim: true },
    shippingAddress: { type: String, default: "", trim: true },
    shippingCity: { type: String, default: "", trim: true },
    shippingState: { type: String, default: "", trim: true },
    shippingZipCode: { type: String, default: "", trim: true },
    shippingCountry: { type: String, default: "United States", trim: true },
    /** Additional contact persons: { contactName, phone, email } */
    additionalContacts: [
      {
        contactName: { type: String, default: "", trim: true },
        phone: { type: String, default: "", trim: true },
        email: { type: String, default: "", trim: true },
      },
    ],
    notes: { type: String, default: "", trim: true },
    /** Token for customer portal link (public view of motors, quotes, status). Unique. */
    portalToken: { type: String, default: "", trim: true },
    /** Shop that owns this customer (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ createdByEmail: 1, createdAt: -1 });
customerSchema.index({ createdByEmail: 1, companyName: 1 });
customerSchema.index({ portalToken: 1 }, { sparse: true, unique: true });

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
