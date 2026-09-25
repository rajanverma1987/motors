/**
 * Request-body validation for IQMotorTrack motor writes (§6.3).
 */

import { clampString } from "@/lib/validation";
import { TRACK_MOTOR_TEXT_FIELDS } from "@/lib/track-motor-fields";
import { resolveMachineType } from "@/lib/machine-types";
import { TRACK_MOTOR_CRITICALITY, TRACK_MOTOR_STATUS } from "@/models/TrackMotor";

function parseDate(value) {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function urlList(raw, max = 8) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => clampString(u, 500))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Copy validated motor fields from a request body onto a target object.
 * Only keys present in `body` are touched, so PATCH stays partial.
 *
 * @param {Record<string, unknown>} body
 * @param {Record<string, unknown>} target
 */
export function applyTrackMotorFields(body, target) {
  for (const [key, max] of Object.entries(TRACK_MOTOR_TEXT_FIELDS)) {
    if (body[key] === undefined) continue;
    target[key] = clampString(body[key], max);
  }
  if (body.powerType !== undefined) {
    target.powerType = resolveMachineType(body.powerType, "AC");
  }
  if (body.criticality !== undefined && TRACK_MOTOR_CRITICALITY.includes(String(body.criticality))) {
    target.criticality = String(body.criticality);
  }
  if (body.status !== undefined && TRACK_MOTOR_STATUS.includes(String(body.status))) {
    target.status = String(body.status);
  }
  if (body.installDate !== undefined) {
    const parsed = parseDate(body.installDate);
    if (parsed !== undefined) target.installDate = parsed;
  }
  if (body.nameplatePhotoUrl !== undefined) {
    target.nameplatePhotoUrl = clampString(body.nameplatePhotoUrl, 500);
  }
  if (body.motorPhotoUrl !== undefined) {
    target.motorPhotoUrl = clampString(body.motorPhotoUrl, 500);
  }
  if (body.extraPhotoUrls !== undefined) {
    target.extraPhotoUrls = urlList(body.extraPhotoUrls);
  }
  return target;
}

/**
 * Required-field checks shared by create and update.
 * @param {Record<string, unknown>} motor
 * @returns {string} error message, or "" when valid
 */
export function validateTrackMotor(motor) {
  const type = resolveMachineType(motor?.powerType, "AC");
  if (!String(motor.manufacturer || "").trim()) return "Manufacturer is required.";
  if (type !== "Pump" && !String(motor.voltage || "").trim()) return "Voltage is required.";
  const hasPower = String(motor.hp || "").trim() || String(motor.kw || "").trim();
  if (type === "Pump") {
    if (!hasPower && !String(motor.ratedFlow || "").trim()) {
      return "Enter HP, kW, or rated flow.";
    }
  } else if (type === "Generator") {
    if (!hasPower && !String(motor.kva || "").trim()) return "Enter kVA, HP, and/or kW.";
    if (!String(motor.voltage || "").trim()) return "Voltage is required.";
  } else if (!hasPower) {
    return "Enter HP and/or kW.";
  }
  if (!String(motor.facilityLocation || "").trim()) {
    return "Facility location is required, for example \"Building A, Line 3\".";
  }
  return "";
}
