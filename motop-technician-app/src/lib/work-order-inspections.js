/**
 * Work order inspection field defs — keep aligned with src/lib/repair-flow-preliminary-fields.js
 */

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
    { key: "additionalFindings", label: "Additional findings", multiline: true },
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
    { key: "additionalFindings", label: "Additional findings", multiline: true },
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
    { key: "additionalFindings", label: "Additional findings", multiline: true },
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
    { key: "additionalFindings", label: "Additional findings", multiline: true },
  ],
  full_motor: [
    { key: "overallMeggerIr", label: "Insulation / megger (overall)" },
    { key: "rotationFreeSpin", label: "Rotation / free spin" },
    { key: "noiseSmell", label: "Noise / smell" },
    { key: "visibleDamage", label: "Visible damage" },
    { key: "additionalFindings", label: "Additional findings", multiline: true },
  ],
};

export const DETAILED_INSPECTION_FIELDS = [
  { key: "windingCondition", label: "Winding condition" },
  { key: "coreDamage", label: "Core / lamination damage" },
  { key: "bearingFailure", label: "Bearing" },
  { key: "shaftIssues", label: "Shaft / mechanical" },
  { key: "additionalFindings", label: "Additional findings", multiline: true },
];

export const INITIAL_DETAILED_FINDINGS = {
  windingCondition: "",
  coreDamage: "",
  bearingFailure: "",
  shaftIssues: "",
  additionalFindings: "",
};

export function inspectionComponentsForMotorClass(motorClass) {
  const t = String(motorClass || "").toUpperCase();
  if (t === "DC") {
    return [
      { value: "field_frame", label: "Field frame" },
      { value: "armature", label: "Armature" },
    ];
  }
  return [
    { value: "stator", label: "Stator" },
    { value: "rotor", label: "Rotor" },
  ];
}

export function preliminaryFieldDefs(component) {
  const c = String(component || "").trim();
  return PRELIMINARY_FIELDS_BY_COMPONENT[c] || PRELIMINARY_FIELDS_BY_COMPONENT.stator;
}

export function emptyPreliminaryFindings(component) {
  const o = {};
  for (const { key } of preliminaryFieldDefs(component)) {
    o[key] = "";
  }
  return o;
}

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

export function componentLabel(motorClass, value) {
  const opts = inspectionComponentsForMotorClass(motorClass);
  return opts.find((o) => o.value === value)?.label || value || "—";
}

export function inspectionSummaryRow(row) {
  const f = row.findings && typeof row.findings === "object" ? row.findings : {};
  const chunks = [];
  for (const [, v] of Object.entries(f)) {
    const t = String(v || "").trim();
    if (t) chunks.push(t.length > 48 ? `${t.slice(0, 48)}…` : t);
  }
  if (!chunks.length) return "—";
  const joined = chunks.slice(0, 2).join(" · ");
  return chunks.length > 2 ? `${joined}…` : joined;
}

export function getDetailedViewEntries(findings) {
  const f = findings && typeof findings === "object" ? findings : {};
  return DETAILED_INSPECTION_FIELDS.map(({ key, label }) => ({
    key,
    label,
    text: strTrim(f[key]) ? String(f[key]) : "—",
  }));
}

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
    if (defKeys.has(key)) continue;
    const t = strTrim(val);
    if (!t) continue;
    rows.push({ key, label, text: t });
  }
  return rows;
}

export function kindLabel(kind) {
  if (kind === "preliminary") return "Pre-inspection";
  if (kind === "detailed") return "Detailed";
  return kind || "—";
}
