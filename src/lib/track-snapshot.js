/**
 * Snapshot builders for IQMotorTrack RFQs (§4.5, §9.3).
 * Every RFQ carries the motor exactly as it was when sent, so later edits to the
 * motor never change what shops already received.
 */

import {
  TRACK_CRITICALITY_LABEL,
  TRACK_LOCATION_DISPLAY_FIELDS,
  TRACK_NAMEPLATE_DISPLAY_FIELDS,
  TRACK_STATUS_LABEL,
  trackMotorLocation,
  trackMotorTitle,
} from "@/lib/track-motor-fields";

const SNAPSHOT_KEYS = [
  "manufacturer",
  "modelNumber",
  "serialNumber",
  "powerType",
  "motorType",
  "hp",
  "kw",
  "voltage",
  "fullLoadAmps",
  "rpm",
  "phase",
  "hz",
  "poles",
  "frame",
  "enclosure",
  "insulationClass",
  "serviceFactor",
  "nemaDesign",
  "kva",
  "powerFactor",
  "ratedFlow",
  "ratedHead",
  "pumpSize",
  "bearingDE",
  "bearingODE",
  "facilityLocation",
  "locationBuilding",
  "locationArea",
  "locationAssetTag",
  "application",
  "criticality",
  "notes",
];

/**
 * @param {Record<string, unknown>} motor Mongoose doc or plain object
 */
export function buildTrackMotorSnapshot(motor) {
  const src = motor?.toObject ? motor.toObject() : motor || {};
  const out = {};
  for (const key of SNAPSHOT_KEYS) out[key] = String(src[key] ?? "");
  out.trackMotorId = String(src._id || src.id || "");
  out.installDate = src.installDate ? new Date(src.installDate).toISOString() : null;
  out.title = trackMotorTitle(src);
  out.locationLine = trackMotorLocation(src);
  out.criticalityLabel = TRACK_CRITICALITY_LABEL[String(src.criticality || "standard")] || "";
  out.statusLabel = TRACK_STATUS_LABEL[String(src.status || "in_service")] || "";
  out.photos = [src.nameplatePhotoUrl, src.motorPhotoUrl, ...(src.extraPhotoUrls || [])]
    .map((u) => String(u || "").trim())
    .filter(Boolean);
  out.nameplatePhotoUrl = String(src.nameplatePhotoUrl || "");
  out.motorPhotoUrl = String(src.motorPhotoUrl || "");
  return out;
}

/**
 * Grouped label/value rows for rendering a snapshot on the shop side.
 * @param {Record<string, unknown>|null|undefined} snapshot
 */
export function trackSnapshotDisplayGroups(snapshot) {
  const src = snapshot || {};
  const pick = (fields) =>
    fields
      .map(({ key, label }) => {
        let value = src[key];
        if (key === "criticality") value = src.criticalityLabel || value;
        if (key === "status") value = src.statusLabel || value;
        if (key === "installDate" && value) {
          try {
            value = new Date(value).toLocaleDateString();
          } catch {
            /* keep raw */
          }
        }
        return { key, label, value: String(value ?? "").trim() };
      })
      .filter((row) => row.value);

  return [
    { id: "nameplate", label: "Nameplate", rows: pick(TRACK_NAMEPLATE_DISPLAY_FIELDS) },
    { id: "location", label: "Location and operation", rows: pick(TRACK_LOCATION_DISPLAY_FIELDS) },
  ].filter((group) => group.rows.length > 0);
}

/**
 * @param {Record<string, unknown>} facility
 */
export function buildTrackFacilitySnapshot(facility) {
  const src = facility?.toObject ? facility.toObject() : facility || {};
  return {
    facilityId: String(src._id || src.id || ""),
    facilityName: String(src.facilityName || ""),
    contactName: String(src.contactName || ""),
    email: String(src.email || ""),
    phone: String(src.phone || ""),
    address: String(src.address || ""),
    city: String(src.city || ""),
    state: String(src.state || ""),
    postalCode: String(src.postalCode || ""),
    country: String(src.country || ""),
    countryCode: String(src.countryCode || ""),
  };
}

/**
 * Service history summary shared with shops. Prices from other shops are stripped (§4.7, §12).
 * @param {Record<string, unknown>[]} entries
 */
export function buildTrackServiceHistorySummary(entries) {
  return (Array.isArray(entries) ? entries : []).slice(0, 20).map((entry) => {
    const src = entry?.toObject ? entry.toObject() : entry;
    return {
      completedAt: src.completedAt ? new Date(src.completedAt).toISOString() : null,
      workType: String(src.workType || ""),
      description: String(src.description || "").slice(0, 500),
      failureCause: String(src.failureCause || "").slice(0, 300),
      warrantyMonths:
        src.warrantyMonths === null || src.warrantyMonths === undefined ? null : Number(src.warrantyMonths),
    };
  });
}
