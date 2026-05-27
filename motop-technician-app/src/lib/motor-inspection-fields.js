/**
 * Mirror of src/lib/motor-inspection-fields.js for the technician app.
 */

export const MOTOR_INSPECTION_COMPONENT = "full_motor";

export const VISUAL_STATUS_OPTIONS = [
  { value: "good", label: "Visually Good" },
  { value: "burned", label: "Visually Burned" },
];

export const PASS_FAIL_OPTIONS = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
];

export const SURGE_FAILURE_CHECKBOXES = [
  { key: "surgeFailCoilToCoil", label: "Surge Fail Coil To Coil" },
  { key: "surgeFailTurnToTurn", label: "Surge Fail Turn To Turn" },
  { key: "surgeFailPhaseToPhase", label: "Surge Fail Phase To Phase" },
  { key: "surgeFailPhaseToGround", label: "Surge Fail Phase To Ground" },
  { key: "surgeFailSinglePhased", label: "Surge Fail Single Phased" },
];

export const MOTOR_INSPECTION_FIELD_DEFS = [
  { key: "incomingLeads", label: "Incoming Leads" },
  { key: "markedMotorSides", label: "Marked Motor Sides" },
  { key: "junctionBoxLocation", label: "Junction Box Location" },
  { key: "brokenPartsNotes", label: "Broken Parts Notes", multiline: true },
  { key: "endBellFitDE", label: "End Bell Fit DE" },
  { key: "endBellFitODE", label: "End Bell Fit ODE" },
  { key: "rotorFitDE", label: "Rotor Fit DE" },
  { key: "rotorFitODE", label: "Rotor Fit ODE" },
  { key: "shaftMeasurement", label: "Shaft Measurement" },
  { key: "shaftRunout", label: "Shaft Runout" },
  { key: "numberOfBearings", label: "Number Of Bearings", type: "number", defaultValue: "0" },
  { key: "bearingSizeDE", label: "Bearing Size DE" },
  { key: "bearingSizeODE", label: "Bearing Size ODE" },
  { key: "sealSizeDE", label: "Seal Size DE" },
  { key: "sealSizeODE", label: "Seal Size ODE" },
  { key: "otherNotes", label: "Other Notes", multiline: true },
  { key: "maggerVoltage", label: "Magger Voltage", type: "number", defaultValue: "0" },
  { key: "maggerMicroAmps", label: "Magger Micro Amps", type: "number", defaultValue: "0" },
  { key: "surgeVoltage", label: "Surge Voltage", type: "number", defaultValue: "0" },
  { key: "finalNotes", label: "Final Notes", multiline: true },
];

export function emptyMotorInspectionFindings() {
  const o = { visualStatus: "", maggerTest: "", surgeTest: "" };
  for (const { key, defaultValue } of MOTOR_INSPECTION_FIELD_DEFS) {
    o[key] = defaultValue != null ? String(defaultValue) : "";
  }
  for (const { key } of SURGE_FAILURE_CHECKBOXES) {
    o[key] = "false";
  }
  return o;
}

export function mergeMotorInspectionFindings(saved) {
  const base = emptyMotorInspectionFindings();
  const s = saved && typeof saved === "object" ? saved : {};
  for (const k of Object.keys(base)) {
    if (s[k] != null) base[k] = String(s[k]);
  }
  return base;
}

export function buildMotorInspectionFindingsPayload(values) {
  const merged = mergeMotorInspectionFindings(values);
  const out = {};
  for (const k of Object.keys(merged)) {
    out[k] = merged[k] != null ? String(merged[k]) : "";
  }
  return out;
}

export function motorInspectionSummary(findings) {
  const f = findings && typeof findings === "object" ? findings : {};
  const parts = [];
  const vis = String(f.visualStatus || "").trim();
  if (vis === "good") parts.push("Visually Good");
  if (vis === "burned") parts.push("Visually Burned");
  const notes = String(f.finalNotes || f.otherNotes || "").trim();
  if (notes) parts.push(notes.length > 40 ? `${notes.slice(0, 40)}…` : notes);
  return parts.length ? parts.join(" · ") : "—";
}

export function kindLabel(kind) {
  if (kind === "preliminary") return "Pre-inspection";
  if (kind === "detailed") return "Detailed";
  return kind || "—";
}

function strTrim(v) {
  return v == null ? "" : String(v).trim();
}

function labelForVisualStatus(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "good") return "Visually Good";
  if (s === "burned") return "Visually Burned";
  return s ? v : "—";
}

function labelForPassFail(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "pass") return "Pass";
  if (s === "fail") return "Fail";
  return s ? v : "—";
}

function boolChecked(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

export function usesUnifiedMotorInspectionFindings(findings) {
  const f = findings && typeof findings === "object" ? findings : {};
  return !!(f.visualStatus && String(f.visualStatus).trim());
}

export function getMotorInspectionViewEntries(findings) {
  const f = findings && typeof findings === "object" ? findings : {};
  const rows = [{ key: "visualStatus", label: "Visual Status", text: labelForVisualStatus(f.visualStatus) }];
  for (const { key, label } of MOTOR_INSPECTION_FIELD_DEFS) {
    rows.push({ key, label, text: strTrim(f[key]) || "—" });
  }
  rows.push({ key: "maggerTest", label: "Magger Test", text: labelForPassFail(f.maggerTest) });
  rows.push({ key: "surgeTest", label: "Surge Test", text: labelForPassFail(f.surgeTest) });
  for (const { key, label } of SURGE_FAILURE_CHECKBOXES) {
    rows.push({ key, label, text: boolChecked(f[key]) ? "Yes" : "—" });
  }
  return rows;
}
