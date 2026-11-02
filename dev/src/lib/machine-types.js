/**
 * Simple portal machine types. Stored on the proposal as `motorPower` (D1).
 * Canonical values: AC, DC, Pump, Generator.
 */

export const MACHINE_TYPES = ["AC", "DC", "Pump", "Generator"];

export const MACHINE_TYPE_DATASHEET_KEY = {
  AC: "acDatasheet",
  DC: "dcDatasheet",
  Pump: "pumpDatasheet",
  Generator: "generatorDatasheet",
};

/** @param {unknown} value @returns {"AC"|"DC"|"Pump"|"Generator"|""} */
export function normalizeMachineType(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "AC") return "AC";
  if (key === "DC") return "DC";
  if (key === "PUMP") return "Pump";
  if (key === "GENERATOR") return "Generator";
  return "";
}

/** @param {unknown} value @param {"AC"|"DC"|"Pump"|"Generator"} [fallback] */
export function resolveMachineType(value, fallback = "AC") {
  return normalizeMachineType(value) || fallback;
}

export function datasheetStorageKey(machineType) {
  return MACHINE_TYPE_DATASHEET_KEY[resolveMachineType(machineType)] || "acDatasheet";
}

export function machineTypesMatch(a, b) {
  const left = normalizeMachineType(a);
  const right = normalizeMachineType(b);
  return Boolean(left) && left === right;
}

export function machineTypeDocumentTitle(machineType) {
  const type = resolveMachineType(machineType);
  if (type === "Pump") return "Pump Datasheet";
  if (type === "Generator") return "Generator Datasheet";
  if (type === "DC") return "DC Motor Datasheet";
  return "AC Motor Datasheet";
}

/** Proposal motor-row labels. Same stored keys, different wording per type (D2). */
const PROPOSAL_FIELD_LABELS = {
  AC: {},
  DC: {},
  Pump: {
    hpKw: "Power Required",
    frameType: "Pump Type",
    cd: "Impeller Dia.",
    bars: "No. of Vanes",
  },
  Generator: {
    hpKw: "kW",
    frameType: "Enclosure / IP",
    cd: "Core Dia.",
  },
};

export function proposalMotorFieldLabel(machineType, key, fallback) {
  const type = resolveMachineType(machineType);
  return PROPOSAL_FIELD_LABELS[type]?.[key] || fallback;
}

/** Pump and generator have no winding diagram templates yet, so Diagrams stays hidden. */
export function machineTypeDiagramsEnabled(machineType) {
  const type = resolveMachineType(machineType);
  return type === "AC" || type === "DC";
}
