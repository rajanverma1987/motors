/**
 * Preliminary inspection fields per component (AC stator/rotor, DC field/armature).
 * Aligned with documents/inspectionFields.md. Findings are stored as a flat object on MotorRepairInspection.findings.
 */

/** @typedef {{ key: string, label: string, multiline?: boolean, rows?: number }} PreliminaryFieldDef */

/** @type {Record<string, PreliminaryFieldDef[]>} */
export const PRELIMINARY_FIELDS_BY_COMPONENT = {
  stator: [
    { key: "phaseResistanceRyb", label: "Phase resistance (R / Y / B)" },
    { key: "resistanceImbalancePct", label: "Resistance imbalance (%)" },
    { key: "irToGroundMegger", label: "Insulation resistance (IR to ground – Megger)" },
    { key: "irPhaseToPhase", label: "IR phase to phase" },
    { key: "polarizationIndex", label: "Polarization index (PI)" },
    { key: "surgeTestResult", label: "Surge test result (Pass/Fail)" },
    { key: "windingCondition", label: "Winding condition (Burnt / Healthy / Rewound)" },
    { key: "slotCondition", label: "Slot condition" },
    { key: "coreCondition", label: "Core condition (Overheating / Lamination damage)" },
    { key: "rtdTempSensorStatus", label: "RTD / temp sensor status" },
    { key: "terminalCondition", label: "Terminal condition" },
    { key: "additionalFindings", label: "Additional findings", multiline: true, rows: 3 },
  ],
  rotor: [
    { key: "rotorType", label: "Rotor type (Squirrel cage / Wound)" },
    { key: "barCondition", label: "Bar condition (Cracked / OK)" },
    { key: "endRingCondition", label: "End ring condition" },
    { key: "rotorResistanceWound", label: "Rotor resistance (if wound)" },
    { key: "shaftRunout", label: "Shaft runout" },
    { key: "shaftJournalCondition", label: "Shaft journal condition" },
    { key: "dynamicBalanceStatus", label: "Dynamic balance status" },
    { key: "bearingFitCondition", label: "Bearing fit condition" },
    { key: "rotorCoreCondition", label: "Rotor core condition" },
    { key: "additionalFindings", label: "Additional findings", multiline: true, rows: 3 },
  ],
  field_frame: [
    { key: "fieldCoilResistance", label: "Field coil resistance" },
    { key: "irToGround", label: "IR to ground" },
    { key: "fieldPolarizationIndex", label: "PI value" },
    { key: "fieldCoilCondition", label: "Field coil condition (Burnt / OK)" },
    { key: "poleCondition", label: "Pole condition" },
    { key: "poleShoeTightness", label: "Pole shoe tightness" },
    { key: "yokeCondition", label: "Yoke condition" },
    { key: "interpoleCondition", label: "Interpole condition (if any)" },
    { key: "additionalFindings", label: "Additional findings", multiline: true, rows: 3 },
  ],
  armature: [
    { key: "armatureResistance", label: "Armature resistance" },
    { key: "armatureIrToGround", label: "IR to ground" },
    { key: "growlerTestResult", label: "Growler test result (Pass/Fail)" },
    { key: "barToBarTest", label: "Bar-to-bar test" },
    { key: "commutatorCondition", label: "Commutator condition (Smooth / Pitted / Burnt)" },
    { key: "commutatorUndercutStatus", label: "Commutator undercut status" },
    { key: "segmentTightness", label: "Segment tightness" },
    { key: "armatureShaftRunout", label: "Shaft runout" },
    { key: "balanceStatus", label: "Balance status" },
    { key: "bearingSeatCondition", label: "Bearing seat condition" },
    { key: "additionalFindings", label: "Additional findings", multiline: true, rows: 3 },
  ],
  full_motor: [
    { key: "overallMeggerIr", label: "Insulation / megger (overall)" },
    { key: "rotationFreeSpin", label: "Rotation / free spin" },
    { key: "noiseSmell", label: "Noise / smell" },
    { key: "visibleDamage", label: "Visible damage" },
    { key: "additionalFindings", label: "Additional findings", multiline: true, rows: 3 },
  ],
};

const DEFAULT_COMPONENT = "stator";

export function preliminaryFieldDefs(component) {
  const c = String(component || "").trim();
  return PRELIMINARY_FIELDS_BY_COMPONENT[c] || PRELIMINARY_FIELDS_BY_COMPONENT[DEFAULT_COMPONENT];
}

/** Empty findings object for a component (all defined keys → ""). */
export function emptyPreliminaryFindings(component) {
  const o = {};
  for (const { key } of preliminaryFieldDefs(component)) {
    o[key] = "";
  }
  return o;
}

/** Build payload object for API from form state (only keys valid for this component). */
export function buildPreliminaryFindingsPayload(component, values) {
  const v = values && typeof values === "object" ? values : {};
  const out = {};
  for (const { key } of preliminaryFieldDefs(component)) {
    out[key] = v[key] != null ? String(v[key]) : "";
  }
  return out;
}

function strTrim(v) {
  return v == null ? "" : String(v).trim();
}

const DETAILED_FINDING_KEYS = new Set(["windingCondition", "coreDamage", "bearingFailure", "shaftIssues"]);

const DETAILED_VIEW_DEFS = [
  { key: "windingCondition", label: "Winding condition" },
  { key: "coreDamage", label: "Core / lamination damage" },
  { key: "bearingFailure", label: "Bearing" },
  { key: "shaftIssues", label: "Shaft / mechanical" },
  { key: "additionalFindings", label: "Additional findings" },
];

/**
 * Read-only rows for detailed (post-disassembly) inspection findings.
 * @returns {Array<{ key: string, label: string, text: string }>}
 */
export function getDetailedViewEntries(findings) {
  const f = findings && typeof findings === "object" ? findings : {};
  return DETAILED_VIEW_DEFS.map(({ key, label }) => ({
    key,
    label,
    text: strTrim(f[key]) ? String(f[key]) : "—",
  }));
}

/**
 * Rows for read-only preliminary inspection (current field set + legacy keys not in set).
 * @returns {Array<{ key: string, label: string, text: string }>}
 */
export function getPreliminaryViewEntries(component, findings) {
  const f = findings && typeof findings === "object" ? findings : {};
  const defs = preliminaryFieldDefs(component);
  const defKeys = new Set(defs.map((d) => d.key));
  const rows = defs.map(({ key, label }) => ({
    key,
    label,
    text: strTrim(f[key]) ? String(f[key]) : "—",
  }));

  for (const [key, val] of Object.entries(f)) {
    if (defKeys.has(key) || DETAILED_FINDING_KEYS.has(key)) continue;
    const t = strTrim(val);
    if (!t) continue;
    rows.push({ key, label: labelForPreliminaryKey(key), text: t });
  }
  return rows;
}

/**
 * Labels for keys stored before inspectionFields.md (and any ad-hoc keys).
 */
const LEGACY_PRELIM_LABELS = {
  insulationResistance: "Insulation / megger readings",
  windingVisual: "Winding — visual condition",
  leadsConnections: "Leads & connections",
  coreIronVisual: "Core / iron — visual",
  rotationCondition: "Rotation (assembled) — condition",
  noiseSmell: "Noise / smell",
  visibleDamage: "Visible damage",
  additionalFindings: "Additional findings",
  journalBearingVisual: "Journals & bearings — visual",
  balanceRunout: "Balance / runout — observation",
  couplingFan: "Coupling / fan / cooling — visual",
  shortsVisualSigns: "Shorted turn / cage signs (visual)",
  fieldInsulationReadings: "Field insulation readings",
  poleConnections: "Pole / interpole connections",
  poleShoeVisual: "Pole pieces / shoes — visual",
  frameGroundPath: "Frame grounding path",
  barToBarInsulation: "Bar-to-bar / segment insulation",
  commutatorVisual: "Commutator — visual",
  brushTrack: "Brush track / rocker (visual)",
  bandingTies: "Banding / ties — visual",
};

export function labelForPreliminaryKey(key) {
  for (const defs of Object.values(PRELIMINARY_FIELDS_BY_COMPONENT)) {
    const d = defs.find((x) => x.key === key);
    if (d) return d.label;
  }
  return LEGACY_PRELIM_LABELS[key] || key;
}
