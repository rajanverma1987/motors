/** Shared option groups and defaults for directory listing forms (marketing + dashboard). */

export const SERVICES_OFFERED = [
  { key: "acMotorRepair", label: "AC Motor Repair" },
  { key: "dcMotorRepair", label: "DC Motor Repair" },
  { key: "motorRewinding", label: "Motor Rewinding" },
  { key: "pumpRepair", label: "Pump Repair" },
  { key: "generatorRepair", label: "Generator Repair" },
  { key: "servoMotorRepair", label: "Servo Motor Repair" },
  { key: "spindleRepair", label: "Spindle Repair" },
  { key: "vfdRepair", label: "VFD Repair" },
  { key: "fieldService", label: "Field Service" },
  { key: "emergencyRepair", label: "Emergency Repair (24/7)" },
  { key: "onSiteTroubleshooting", label: "On-site Troubleshooting" },
];

export const MOTOR_CAPABILITIES = [
  { key: "lowVoltage", label: "Low Voltage Motor Repair" },
  { key: "mediumVoltage", label: "Medium Voltage Motor Repair" },
  { key: "highVoltage", label: "High Voltage Motor Repair" },
  { key: "explosionProof", label: "Explosion Proof Motors" },
  { key: "hazardousLocation", label: "Hazardous Location Motors" },
  { key: "submersible", label: "Submersible Motors" },
];

export const EQUIPMENT_TESTING = [
  { key: "dynamometer", label: "Dynamometer Testing" },
  { key: "surge", label: "Surge Testing" },
  { key: "vibration", label: "Vibration Analysis" },
  { key: "balancing", label: "Balancing Equipment" },
  { key: "laserAlignment", label: "Laser Alignment" },
  { key: "infrared", label: "Infrared Thermography" },
  { key: "loadTesting", label: "Load Testing" },
  { key: "highVoltageTesting", label: "High Voltage Testing" },
];

export const REWINDING_CAPABILITIES = [
  { key: "acMotorRewinding", label: "AC Motor Rewinding" },
  { key: "dcArmatureRewinding", label: "DC Armature Rewinding" },
  { key: "fieldCoilRewinding", label: "Field Coil Rewinding" },
  { key: "coilManufacturing", label: "Coil Manufacturing" },
  { key: "vpi", label: "Vacuum Pressure Impregnation (VPI)" },
  { key: "insulationUpgrades", label: "Insulation System Upgrades" },
];

export const INDUSTRIES_SERVED = [
  { key: "manufacturing", label: "Manufacturing" },
  { key: "oilGas", label: "Oil & Gas" },
  { key: "waterTreatment", label: "Water Treatment" },
  { key: "powerPlants", label: "Power Plants" },
  { key: "mining", label: "Mining" },
  { key: "hvac", label: "HVAC" },
  { key: "foodProcessing", label: "Food Processing" },
  { key: "agriculture", label: "Agriculture" },
];

export const CERTIFICATIONS = [
  { key: "easaMember", label: "EASA Member" },
  { key: "isoCertification", label: "ISO Certification" },
  { key: "ulCertified", label: "UL Certified" },
  { key: "factoryAuthorizedRepair", label: "Factory Authorized Repair" },
  { key: "insuranceCoverage", label: "Insurance Coverage" },
];

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

export function defaultFormData() {
  return {
    companyName: "",
    shortDescription: "",
    yearsInBusiness: "",
    phone: "",
    website: "",
    primaryContactPerson: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    services: [],
    maxMotorSizeHP: "",
    maxVoltage: "",
    maxWeightHandled: "",
    motorCapabilities: [],
    equipmentTesting: [],
    rewindingCapabilities: [],
    industriesServed: [],
    pickupDeliveryAvailable: false,
    craneCapacity: "",
    forkliftCapacity: "",
    rushRepairAvailable: false,
    turnaroundTime: "",
    certifications: [],
    shopSizeSqft: "",
    numTechnicians: "",
    numEngineers: "",
    yearsCombinedExperience: "",
    galleryPhotos: [],
    serviceZipCode: "",
    serviceRadiusMiles: "",
    statesServed: "",
    citiesOrMetrosServed: "",
    areaCoveredFrom: "",
    email: "",
  };
}

/**
 * Map a Listing document (from API) into client form state.
 * @param {Record<string, unknown> | null} doc
 */
export function listingDocumentToFormData(doc) {
  const base = defaultFormData();
  if (!doc || typeof doc !== "object") return base;
  const arr = (v) => (Array.isArray(v) ? [...v] : []);
  return {
    ...base,
    email: String(doc.email ?? ""),
    companyName: String(doc.companyName ?? ""),
    shortDescription: String(doc.shortDescription ?? ""),
    yearsInBusiness: String(doc.yearsInBusiness ?? ""),
    phone: String(doc.phone ?? ""),
    website: String(doc.website ?? ""),
    primaryContactPerson: String(doc.primaryContactPerson ?? ""),
    address: String(doc.address ?? ""),
    city: String(doc.city ?? ""),
    state: String(doc.state ?? ""),
    zipCode: String(doc.zipCode ?? ""),
    country: String(doc.country ?? "United States") || "United States",
    services: arr(doc.services),
    maxMotorSizeHP: String(doc.maxMotorSizeHP ?? ""),
    maxVoltage: String(doc.maxVoltage ?? ""),
    maxWeightHandled: String(doc.maxWeightHandled ?? ""),
    motorCapabilities: arr(doc.motorCapabilities),
    equipmentTesting: arr(doc.equipmentTesting),
    rewindingCapabilities: arr(doc.rewindingCapabilities),
    industriesServed: arr(doc.industriesServed),
    pickupDeliveryAvailable: !!doc.pickupDeliveryAvailable,
    craneCapacity: String(doc.craneCapacity ?? ""),
    forkliftCapacity: String(doc.forkliftCapacity ?? ""),
    rushRepairAvailable: !!doc.rushRepairAvailable,
    turnaroundTime: String(doc.turnaroundTime ?? ""),
    certifications: arr(doc.certifications),
    shopSizeSqft: String(doc.shopSizeSqft ?? ""),
    numTechnicians: String(doc.numTechnicians ?? ""),
    numEngineers: String(doc.numEngineers ?? ""),
    yearsCombinedExperience: String(doc.yearsCombinedExperience ?? ""),
    galleryPhotos: [],
    serviceZipCode: String(doc.serviceZipCode ?? ""),
    serviceRadiusMiles: String(doc.serviceRadiusMiles ?? ""),
    statesServed: String(doc.statesServed ?? ""),
    citiesOrMetrosServed: String(doc.citiesOrMetrosServed ?? ""),
    areaCoveredFrom: String(doc.areaCoveredFrom ?? ""),
  };
}

/** Payload for PATCH /api/dashboard/directory-listing (no email / gallery — server keeps existing photos). */
export function buildListingDashboardPatchPayload(formData, listingId) {
  const p = buildListingPayloadFromForm(formData);
  delete p.email;
  delete p.galleryPhotoUrls;
  return { id: listingId, ...p };
}

export function buildListingPayloadFromForm(formData) {
  return {
    email: formData.email,
    companyName: formData.companyName,
    shortDescription: formData.shortDescription,
    yearsInBusiness: formData.yearsInBusiness,
    phone: formData.phone,
    website: formData.website,
    primaryContactPerson: formData.primaryContactPerson,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zipCode: formData.zipCode,
    country: formData.country,
    services: formData.services,
    maxMotorSizeHP: formData.maxMotorSizeHP,
    maxVoltage: formData.maxVoltage,
    maxWeightHandled: formData.maxWeightHandled,
    motorCapabilities: formData.motorCapabilities,
    equipmentTesting: formData.equipmentTesting,
    rewindingCapabilities: formData.rewindingCapabilities,
    industriesServed: formData.industriesServed,
    pickupDeliveryAvailable: formData.pickupDeliveryAvailable,
    craneCapacity: formData.craneCapacity,
    forkliftCapacity: formData.forkliftCapacity,
    rushRepairAvailable: formData.rushRepairAvailable,
    turnaroundTime: formData.turnaroundTime,
    certifications: formData.certifications,
    shopSizeSqft: formData.shopSizeSqft,
    numTechnicians: formData.numTechnicians,
    numEngineers: formData.numEngineers,
    yearsCombinedExperience: formData.yearsCombinedExperience,
    galleryPhotoUrls: [],
    serviceZipCode: formData.serviceZipCode,
    serviceRadiusMiles: formData.serviceRadiusMiles,
    statesServed: formData.statesServed,
    citiesOrMetrosServed: formData.citiesOrMetrosServed,
    areaCoveredFrom: formData.areaCoveredFrom,
  };
}
