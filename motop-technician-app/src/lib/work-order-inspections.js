/**
 * Work order inspections — unified motor form (mirror src/lib/motor-inspection-fields.js).
 */

import {
  MOTOR_INSPECTION_COMPONENT,
  MOTOR_INSPECTION_FIELD_DEFS,
  VISUAL_STATUS_OPTIONS,
  PASS_FAIL_OPTIONS,
  SURGE_FAILURE_CHECKBOXES,
  emptyMotorInspectionFindings,
  mergeMotorInspectionFindings,
  buildMotorInspectionFindingsPayload,
  motorInspectionSummary,
  kindLabel,
  getMotorInspectionViewEntries,
  usesUnifiedMotorInspectionFindings,
} from "./motor-inspection-fields";

export {
  MOTOR_INSPECTION_COMPONENT,
  MOTOR_INSPECTION_FIELD_DEFS,
  VISUAL_STATUS_OPTIONS,
  PASS_FAIL_OPTIONS,
  SURGE_FAILURE_CHECKBOXES,
  emptyMotorInspectionFindings,
  mergeMotorInspectionFindings,
  buildMotorInspectionFindingsPayload,
  motorInspectionSummary,
  kindLabel,
};

/** @deprecated Legacy — new inspections use full_motor only. */
export function inspectionComponentsForMotorClass() {
  return [{ value: "full_motor", label: "Motor" }];
}

export function preliminaryFieldDefs() {
  return MOTOR_INSPECTION_FIELD_DEFS;
}

export function emptyPreliminaryFindings() {
  return emptyMotorInspectionFindings();
}

export function buildPreliminaryFindingsPayload(_component, values) {
  return buildMotorInspectionFindingsPayload(values);
}

export function componentLabel(_motorClass, value) {
  return value === "full_motor" ? "Motor" : value || "—";
}

export function inspectionSummaryRow(row) {
  return motorInspectionSummary(row?.findings);
}

export function getPreliminaryViewEntries(_component, findings) {
  if (usesUnifiedMotorInspectionFindings(findings)) {
    return getMotorInspectionViewEntries(findings);
  }
  return getMotorInspectionViewEntries(findings);
}

export function getDetailedViewEntries(findings) {
  return getMotorInspectionViewEntries(findings);
}

export const DETAILED_INSPECTION_FIELDS = MOTOR_INSPECTION_FIELD_DEFS;
export const INITIAL_DETAILED_FINDINGS = emptyMotorInspectionFindings();
