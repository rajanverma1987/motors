import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    // Contact & company
    email: { type: String, required: true },
    companyName: { type: String, required: true },
    logoUrl: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    yearsInBusiness: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    primaryContactPerson: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    country: { type: String, default: "United States" },
    // Services & capabilities (arrays of strings)
    services: [{ type: String }],
    maxMotorSizeHP: { type: String, default: "" },
    maxVoltage: { type: String, default: "" },
    maxWeightHandled: { type: String, default: "" },
    motorCapabilities: [{ type: String }],
    equipmentTesting: [{ type: String }],
    rewindingCapabilities: [{ type: String }],
    industriesServed: [{ type: String }],
    pickupDeliveryAvailable: { type: Boolean, default: false },
    craneCapacity: { type: String, default: "" },
    forkliftCapacity: { type: String, default: "" },
    rushRepairAvailable: { type: Boolean, default: false },
    turnaroundTime: { type: String, default: "" },
    certifications: [{ type: String }],
    shopSizeSqft: { type: String, default: "" },
    numTechnicians: { type: String, default: "" },
    numEngineers: { type: String, default: "" },
    yearsCombinedExperience: { type: String, default: "" },
    galleryPhotoUrls: [{ type: String }],
    serviceZipCode: { type: String, default: "" },
    serviceRadiusMiles: { type: String, default: "" },
    statesServed: { type: String, default: "" },
    citiesOrMetrosServed: { type: String, default: "" },
    areaCoveredFrom: { type: String, default: "" },
    // Status & review
    status: { type: String, enum: ["in-review", "approved", "rejected"], default: "in-review" },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    rejectionReason: { type: String },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

listingSchema.index({ status: 1, submittedAt: -1 });
listingSchema.index({ status: 1 });
listingSchema.index({ companyName: 1 });

export default mongoose.models.Listing || mongoose.model("Listing", listingSchema);
