/**
 * Normalize pasted JSON for the full admin listing create form.
 * Schema matches the listing editor (company, services, capabilities, shop, region, etc.).
 */

import {
  CERTIFICATIONS,
  EQUIPMENT_TESTING,
  INDUSTRIES_SERVED,
  MOTOR_CAPABILITIES,
  REWINDING_CAPABILITIES,
  SERVICES_OFFERED,
  defaultFormData,
} from "@/lib/directory-listing-constants";

const OPTION_KEYS = {
  services: new Set(SERVICES_OFFERED.map((o) => o.key)),
  motorCapabilities: new Set(MOTOR_CAPABILITIES.map((o) => o.key)),
  equipmentTesting: new Set(EQUIPMENT_TESTING.map((o) => o.key)),
  rewindingCapabilities: new Set(REWINDING_CAPABILITIES.map((o) => o.key)),
  industriesServed: new Set(INDUSTRIES_SERVED.map((o) => o.key)),
  certifications: new Set(CERTIFICATIONS.map((o) => o.key)),
};

const STRING_FIELDS = [
  "companyName",
  "email",
  "notificationEmails",
  "phone",
  "primaryContactPerson",
  "shortDescription",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
  "website",
  "password",
  "logoUrl",
  "yearsInBusiness",
  "maxMotorSizeHP",
  "maxVoltage",
  "maxWeightHandled",
  "craneCapacity",
  "forkliftCapacity",
  "turnaroundTime",
  "shopSizeSqft",
  "numTechnicians",
  "numEngineers",
  "yearsCombinedExperience",
  "serviceZipCode",
  "serviceRadiusMiles",
  "statesServed",
  "citiesOrMetrosServed",
  "areaCoveredFrom",
];

const BOOL_FIELDS = ["pickupDeliveryAvailable", "rushRepairAvailable"];

const ARRAY_FIELDS = [
  "services",
  "motorCapabilities",
  "equipmentTesting",
  "rewindingCapabilities",
  "industriesServed",
  "certifications",
  "galleryPhotoUrls",
];

/** Full create-form defaults (listing form + account password). */
export function emptyAdminListingCreateForm() {
  const base = defaultFormData();
  return {
    ...base,
    password: "",
    logoUrl: "",
    notificationEmails: "",
    galleryPhotoUrls: [],
    galleryPhotos: [],
  };
}

function asString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x)).filter(Boolean);
}

function filterKnownKeys(field, values) {
  const allowed = OPTION_KEYS[field];
  if (!allowed) return values;
  return values.filter((k) => allowed.has(k));
}

/**
 * Complete example object for docs / copy-paste templates.
 */
export function adminListingJsonSchemaExample() {
  return {
    companyName: "Acme Motor Repair",
    email: "shop@acmemotor.com",
    notificationEmails: "ops@acmemotor.com, leads@acmemotor.com",
    phone: "7135550100",
    primaryContactPerson: "Jane Doe",
    shortDescription: "Industrial AC/DC motor repair and rewind.",
    yearsInBusiness: "25",
    website: "https://acmemotor.example",
    logoUrl: "",
    password: "",
    address: "123 Industrial Blvd",
    city: "Houston",
    state: "Texas",
    zipCode: "77001",
    country: "United States",
    services: ["acMotorRepair", "motorRewinding", "fieldService"],
    maxMotorSizeHP: "500",
    maxVoltage: "4160",
    maxWeightHandled: "10000 lbs",
    motorCapabilities: ["lowVoltage", "mediumVoltage"],
    equipmentTesting: ["dynamometer", "surge", "vibration"],
    rewindingCapabilities: ["acMotorRewinding", "vpi"],
    industriesServed: ["manufacturing", "oilGas"],
    pickupDeliveryAvailable: true,
    rushRepairAvailable: true,
    craneCapacity: "10 ton",
    forkliftCapacity: "5000 lbs",
    turnaroundTime: "5-7 business days",
    certifications: ["easaMember", "isoCertification"],
    shopSizeSqft: "15000",
    numTechnicians: "12",
    numEngineers: "2",
    yearsCombinedExperience: "80",
    galleryPhotoUrls: [],
    serviceZipCode: "77001",
    serviceRadiusMiles: "100",
    statesServed: "Texas, Louisiana",
    citiesOrMetrosServed: "Houston, Beaumont",
    areaCoveredFrom: "Houston metro and Gulf Coast",
  };
}

/**
 * Parse pasted JSON text into a full listing create prefill object.
 * @param {string} raw
 * @returns {{ ok: true, data: Record<string, unknown>, unknownKeys: string[] } | { ok: false, error: string }}
 */
export function parseAdminListingJsonPrefill(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { ok: false, error: "Paste a JSON object first." };

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON — check commas, quotes, and braces." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "JSON must be a single object, not an array." };
  }

  const out = emptyAdminListingCreateForm();
  const known = new Set([
    ...STRING_FIELDS,
    ...BOOL_FIELDS,
    ...ARRAY_FIELDS,
    "name",
    "zip",
    "contact",
    "galleryPhotos",
  ]);
  const unknownKeys = Object.keys(parsed).filter((k) => !known.has(k));

  for (const key of STRING_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
    if (key === "notificationEmails" && Array.isArray(parsed[key])) {
      out[key] = asStringArray(parsed[key]).join(", ");
      continue;
    }
    out[key] = asString(parsed[key]);
  }
  for (const key of BOOL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      out[key] = asBool(parsed[key]);
    }
  }
  for (const key of ARRAY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
    const values = asStringArray(parsed[key]);
    out[key] = key === "galleryPhotoUrls" ? values : filterKnownKeys(key, values);
  }

  // Aliases
  if (!out.companyName && parsed.name) out.companyName = asString(parsed.name);
  if (!out.zipCode && parsed.zip) out.zipCode = asString(parsed.zip);
  if (!out.primaryContactPerson && parsed.contact) {
    out.primaryContactPerson = asString(parsed.contact);
  }
  if (!out.galleryPhotoUrls?.length && Array.isArray(parsed.galleryPhotos)) {
    out.galleryPhotoUrls = asStringArray(parsed.galleryPhotos);
  }

  out.email = asString(out.email).toLowerCase();
  if (!out.country) out.country = "United States";

  if (!out.email) {
    return { ok: false, error: "JSON must include email." };
  }
  if (!out.companyName) {
    return { ok: false, error: "JSON must include companyName." };
  }

  return { ok: true, data: out, unknownKeys };
}
