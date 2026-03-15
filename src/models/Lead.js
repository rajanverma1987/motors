import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    message: { type: String, default: "" },
    company: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    motorType: { type: String, default: "" },
    motorHp: { type: String, default: "" },
    voltage: { type: String, default: "" },
    problemDescription: { type: String, default: "" },
    urgencyLevel: { type: String, default: "" },
    motorPhotos: [{ type: String }],
    sourceListingId: { type: String, default: "" },
    assignedListingIds: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
