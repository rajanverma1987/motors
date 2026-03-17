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
    /** CRM: new → contacted → quoted → won | lost */
    status: { type: String, enum: ["new", "contacted", "quoted", "won", "lost"], default: "new" },
    /** How lead arrived: website submission, admin assignment, or manual entry */
    leadSource: { type: String, enum: ["website", "admin_assigned", "manual"], default: "website" },
    /** Set when lead is created manually from dashboard (shop user email) */
    createdByEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
