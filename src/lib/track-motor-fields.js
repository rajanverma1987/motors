/**
 * Shared IQMotorTrack motor vocabulary (§6.3, §9.11).
 * Imported by both the plant PWA and the server so labels never drift.
 */

export const TRACK_STATUS_LABEL = {
  in_service: "Running",
  down: "Down",
  awaiting_proposals: "Under repair, awaiting proposals",
  under_repair: "Under repair",
  repaired: "Repaired, awaiting return",
  spare: "Standby",
  retired: "Decommissioned",
};

export const TRACK_STATUS_VARIANT = {
  in_service: "success",
  down: "danger",
  awaiting_proposals: "warning",
  under_repair: "warning",
  repaired: "primary",
  spare: "default",
  retired: "default",
};

/** Statuses a facility user may set by hand. Integration events set the rest. */
export const TRACK_STATUS_OPTIONS = [
  { value: "in_service", label: "Running" },
  { value: "down", label: "Down" },
  { value: "under_repair", label: "Under repair" },
  { value: "spare", label: "Standby" },
  { value: "retired", label: "Decommissioned" },
];

export const TRACK_CRITICALITY_LABEL = {
  critical: "Critical",
  important: "Important",
  standard: "Non-critical",
  spare: "Spare",
};

export const TRACK_CRITICALITY_VARIANT = {
  critical: "danger",
  important: "warning",
  standard: "default",
  spare: "default",
};

export const TRACK_CRITICALITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "important", label: "Important" },
  { value: "standard", label: "Non-critical" },
  { value: "spare", label: "Spare" },
];

export const TRACK_POWER_OPTIONS = [
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
  { value: "Pump", label: "Pump" },
  { value: "Generator", label: "Generator" },
];

export const TRACK_PHASE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "single", label: "Single phase" },
  { value: "three", label: "Three phase" },
];

export const TRACK_ENCLOSURE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "ODP", label: "ODP" },
  { value: "TEFC", label: "TEFC" },
  { value: "TENV", label: "TENV" },
  { value: "TEAO", label: "TEAO" },
  { value: "WPI", label: "WPI" },
  { value: "WPII", label: "WPII" },
  { value: "Explosion-proof", label: "Explosion proof" },
  { value: "Other", label: "Other" },
];

/** Free-text nameplate string fields with their max lengths (§6.3 step 2 and 3). */
export const TRACK_MOTOR_TEXT_FIELDS = {
  manufacturer: 120,
  modelNumber: 120,
  serialNumber: 120,
  motorType: 80,
  hp: 40,
  kw: 40,
  voltage: 80,
  fullLoadAmps: 40,
  rpm: 40,
  phase: 30,
  hz: 20,
  poles: 20,
  frame: 60,
  enclosure: 60,
  insulationClass: 30,
  serviceFactor: 30,
  nemaDesign: 20,
  kva: 40,
  powerFactor: 40,
  ratedFlow: 40,
  ratedHead: 40,
  pumpSize: 40,
  bearingDE: 60,
  bearingODE: 60,
  facilityLocation: 240,
  locationBuilding: 120,
  locationArea: 120,
  locationAssetTag: 80,
  application: 120,
  notes: 2000,
};

/** Fields shown in the Nameplate summary panel and in the RFQ motor snapshot. */
export const TRACK_NAMEPLATE_DISPLAY_FIELDS = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "modelNumber", label: "Model number" },
  { key: "serialNumber", label: "Serial number" },
  { key: "powerType", label: "Machine type" },
  { key: "motorType", label: "Motor type" },
  { key: "hp", label: "HP" },
  { key: "kw", label: "kW" },
  { key: "voltage", label: "Voltage" },
  { key: "fullLoadAmps", label: "Full load amps" },
  { key: "rpm", label: "RPM" },
  { key: "phase", label: "Phase" },
  { key: "hz", label: "Hz" },
  { key: "poles", label: "Poles" },
  { key: "frame", label: "Frame size" },
  { key: "enclosure", label: "Enclosure" },
  { key: "insulationClass", label: "Insulation class" },
  { key: "serviceFactor", label: "Service factor" },
  { key: "nemaDesign", label: "NEMA design letter" },
  { key: "kva", label: "kVA" },
  { key: "powerFactor", label: "Power factor" },
  { key: "ratedFlow", label: "Rated flow" },
  { key: "ratedHead", label: "Rated head" },
  { key: "pumpSize", label: "Pump size" },
  { key: "bearingDE", label: "Bearing DE" },
  { key: "bearingODE", label: "Bearing ODE" },
];

export const TRACK_LOCATION_DISPLAY_FIELDS = [
  { key: "facilityLocation", label: "Facility location" },
  { key: "locationBuilding", label: "Building" },
  { key: "locationArea", label: "Area / line" },
  { key: "locationAssetTag", label: "Asset tag" },
  { key: "application", label: "Application" },
  { key: "criticality", label: "Criticality" },
  { key: "installDate", label: "Install date" },
  { key: "status", label: "Status" },
];

/**
 * Short human title for a motor row.
 * @param {Record<string, unknown>|null|undefined} m
 */
export function trackMotorTitle(m) {
  if (!m) return "Motor";
  const rating = m.hp ? `${m.hp} HP` : m.kw ? `${m.kw} kW` : "";
  const parts = [m.manufacturer, rating, m.voltage].map((v) => String(v || "").trim()).filter(Boolean);
  return parts.join(" · ") || "Motor";
}

/**
 * Location one-liner for lists and labels.
 * @param {Record<string, unknown>|null|undefined} m
 */
export function trackMotorLocation(m) {
  if (!m) return "";
  const parts = [m.facilityLocation, m.locationBuilding, m.locationArea, m.locationAssetTag]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" · ");
}
