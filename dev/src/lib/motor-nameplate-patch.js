import { LIMITS, clampString } from "@/lib/validation";

/** Keys aligned with dashboard motor PATCH and Customer's Motor form (identification + motor details). */
export const MOTOR_NAMEPLATE_FIELD_KEYS = [
  "serialNumber",
  "manufacturer",
  "model",
  "hp",
  "rpm",
  "voltage",
  "kw",
  "amps",
  "frameSize",
  "motorType",
  "slots",
  "coreLength",
  "coreDiameter",
  "bars",
];

const FIELD_MAX = {
  serialNumber: LIMITS.shortText.max,
  manufacturer: LIMITS.shortText.max,
  model: LIMITS.shortText.max,
  hp: 50,
  rpm: 50,
  voltage: 50,
  kw: 50,
  amps: 50,
  frameSize: 100,
  motorType: LIMITS.shortText.max,
  slots: 50,
  coreLength: 50,
  coreDiameter: 50,
  bars: 50,
};

/**
 * Apply nameplate / motor detail fields from `raw` onto a Motor Mongoose document.
 * Only keys present on `raw` are updated (undefined keys are skipped).
 * @returns {boolean} true if at least one field was applied
 */
export function applyMotorNameplateFields(doc, raw) {
  if (!raw || typeof raw !== "object") return false;
  let changed = false;
  for (const key of MOTOR_NAMEPLATE_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const max = FIELD_MAX[key];
    doc[key] = clampString(raw[key], max);
    changed = true;
  }
  return changed;
}

/** Build a plain object of nameplate fields from a lean Motor doc (for API JSON). */
export function motorNameplateFromLean(motor) {
  if (!motor) return null;
  const o = {};
  for (const key of MOTOR_NAMEPLATE_FIELD_KEYS) {
    o[key] = motor[key] ?? "";
  }
  return o;
}

export function emptyMotorNameplate() {
  return Object.fromEntries(MOTOR_NAMEPLATE_FIELD_KEYS.map((k) => [k, ""]));
}

/** Short labels for compact / read-only nameplate display (aligned with Customer's Motor form). */
export const MOTOR_NAMEPLATE_DISPLAY_LABELS = {
  serialNumber: "Serial",
  manufacturer: "Manufacturer",
  model: "Model",
  motorType: "Type",
  hp: "HP",
  rpm: "RPM",
  voltage: "Voltage",
  kw: "KW",
  amps: "AMPs",
  frameSize: "Frame",
  slots: "Slots",
  coreLength: "Core L",
  coreDiameter: "Core Ø",
  bars: "Bars",
};
