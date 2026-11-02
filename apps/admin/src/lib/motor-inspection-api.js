import {
  buildMotorInspectionFindingsPayload,
  MOTOR_INSPECTION_COMPONENT,
} from "@/lib/motor-inspection-fields";

export const INSPECTION_KINDS = new Set(["preliminary", "detailed"]);

export function normalizeInspectionKind(raw) {
  const k = typeof raw === "string" ? raw.trim() : "";
  return INSPECTION_KINDS.has(k) ? k : null;
}

export function normalizeInspectionFindings(body) {
  return buildMotorInspectionFindingsPayload(body?.findings);
}

export function inspectionComponentForSave() {
  return MOTOR_INSPECTION_COMPONENT;
}

export function toPublicInspection(row) {
  const o = row.toObject ? row.toObject() : row;
  return { ...o, id: o._id.toString(), _id: undefined };
}
