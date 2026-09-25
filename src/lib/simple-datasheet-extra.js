/**
 * Pump and Generator datasheets. AC and DC shapes in simple-datasheet-form.js are unchanged.
 */

import { todayISODate } from "@/lib/simple-service-proposal-form";

function blankFieldMap(columns) {
  const out = {};
  for (const col of columns) {
    for (const f of col) out[f.key] = "";
  }
  return out;
}

function strMap(keys, overrides, defaults = {}) {
  const out = { ...defaults };
  for (const key of keys) {
    if (out[key] == null) out[key] = "";
  }
  const src = overrides && typeof overrides === "object" ? overrides : {};
  for (const key of Object.keys(out)) {
    if (src[key] != null) out[key] = String(src[key]);
  }
  return out;
}

function fillBlankFields(target, source) {
  const out = { ...(target && typeof target === "object" ? target : {}) };
  if (!source || typeof source !== "object") return out;
  for (const [key, value] of Object.entries(source)) {
    const next = String(value ?? "").trim();
    if (!next) continue;
    if (String(out[key] ?? "").trim()) continue;
    out[key] = next;
  }
  return out;
}

function bindHeader(base, proposalForm, meta) {
  const f = proposalForm || {};
  return {
    date: String(base.date || f.dateCreated || todayISODate()).slice(0, 10),
    technician: String(
      base.technician || meta.technicianValue || meta.technicianLabel || f.preparedBy || ""
    ).trim(),
    jobNumber: String(f.documentNumber || "").trim() || String(base.jobNumber || "").trim(),
    company: String(base.company || meta.companyName || "").trim(),
  };
}

function isDefaultish(key, value, zeroKeys, checkKeys) {
  const v = String(value ?? "").trim();
  if (!v) return true;
  if (checkKeys.has(key)) return v.toLowerCase() !== "true";
  if (zeroKeys.has(key)) return v === "0";
  return false;
}

function blockHasMeaningful(block, keys, zeroKeys, checkKeys) {
  if (!block || typeof block !== "object") return false;
  for (const key of keys) {
    if (isDefaultish(key, block[key], zeroKeys, checkKeys)) continue;
    if (String(block[key] ?? "").trim()) return true;
  }
  return false;
}

function columnHasData(block, columns) {
  if (!block || typeof block !== "object") return false;
  for (const col of columns) {
    for (const f of col) {
      const v = String(block[f.key] ?? "").trim();
      if (!v) continue;
      if (f.key === "no_of_bearings" && v === "0") continue;
      return true;
    }
  }
  return Boolean(String(block.notes ?? "").trim());
}

export const PUMP_DATASHEET_SECTIONS = ["Complete Pump", "Pump End Only"];
export const PUMP_TAB_DATASHEET = "DataSheet";
export const PUMP_TAB_DISASSEMBLY = "Disassembly";
export const PUMP_TAB_ASSEMBLY = "Assembly";

export function pumpDatasheetVisibleTabs(section) {
  if (String(section || "").trim() === "Complete Pump") {
    return [PUMP_TAB_DATASHEET, PUMP_TAB_DISASSEMBLY, PUMP_TAB_ASSEMBLY];
  }
  return [PUMP_TAB_DATASHEET];
}

export const PUMP_DATASHEET_FIELD_COLUMNS = [
  [
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "serial_no", label: "Serial No." },
    { key: "pump_type", label: "Pump Type" },
    { key: "size", label: "Size" },
    { key: "stages", label: "Stages" },
    { key: "orientation", label: "Orientation" },
    { key: "suction_size", label: "Suction Size" },
    { key: "discharge_size", label: "Discharge Size" },
    { key: "flange_rating", label: "Flange Rating" },
    { key: "casing_material", label: "Casing Material" },
    { key: "impeller_material", label: "Impeller Material" },
    { key: "shaft_material", label: "Shaft Material" },
    { key: "mounting", label: "Mounting" },
  ],
  [
    { key: "rated_flow", label: "Rated Flow (GPM or m3/h)" },
    { key: "rated_head", label: "Rated Head (ft or m)" },
    { key: "rated_speed", label: "Rated Speed (RPM)" },
    { key: "bep_flow", label: "BEP Flow" },
    { key: "shutoff_head", label: "Shutoff Head" },
    { key: "npsh_required", label: "NPSH Required" },
    { key: "efficiency_pct", label: "Efficiency %" },
    { key: "power_required", label: "Power Required (BHP or kW)" },
    { key: "impeller_dia", label: "Impeller Dia." },
    { key: "impeller_type", label: "Impeller Type" },
    { key: "no_of_vanes", label: "No. of Vanes" },
    { key: "rotation", label: "Rotation" },
    { key: "liquid_pumped", label: "Liquid Pumped" },
    { key: "temperature", label: "Temperature" },
    { key: "specific_gravity", label: "Specific Gravity" },
    { key: "viscosity", label: "Viscosity" },
  ],
  [
    { key: "seal_type", label: "Seal Type" },
    { key: "seal_make_model", label: "Seal Make / Model" },
    { key: "seal_size", label: "Seal Size" },
    { key: "seal_faces", label: "Seal Faces" },
    { key: "flush_plan", label: "Flush Plan" },
    { key: "packing_size", label: "Packing Size" },
    { key: "no_of_packing_rings", label: "No. of Packing Rings" },
    { key: "lantern_ring", label: "Lantern Ring" },
    { key: "bearing_de", label: "Bearing DE" },
    { key: "bearing_ode", label: "Bearing ODE" },
    { key: "bearing_lubrication", label: "Bearing Lubrication" },
    { key: "wear_ring_clearance_design", label: "Wear Ring Clearance (design)" },
    { key: "impeller_clearance_design", label: "Impeller Clearance (design)" },
    { key: "coupling_type_size", label: "Coupling Type / Size" },
    { key: "driver", label: "Driver" },
  ],
];

export const PUMP_COLUMN_TITLES = ["Identity and construction", "Hydraulic duty", "Sealing and bearings"];

export const PUMP_VISUAL_ROWS = [
  { key: "casingStatus", label: "Casing" },
  { key: "impellerStatus", label: "Impeller" },
  { key: "wearRingsStatus", label: "Wear Rings" },
  { key: "shaftStatus", label: "Shaft" },
  { key: "bearingsStatus", label: "Bearings" },
  { key: "sealOrPackingStatus", label: "Seal or Packing" },
  { key: "couplingStatus", label: "Coupling" },
];

export const PUMP_FAILURE_CHECKS = [
  { key: "failCavitation", label: "Cavitation damage" },
  { key: "failErosion", label: "Erosion / abrasive wear" },
  { key: "failCorrosion", label: "Corrosion" },
  { key: "failSeal", label: "Seal failure" },
  { key: "failBearing", label: "Bearing failure" },
  { key: "failShaftBreakage", label: "Shaft breakage" },
  { key: "failImpellerDamage", label: "Impeller damage" },
  { key: "failDryRun", label: "Dry run" },
  { key: "failMisalignment", label: "Misalignment" },
  { key: "failExcessiveVibration", label: "Excessive vibration" },
  { key: "failOverheating", label: "Overheating" },
];

const PUMP_DISASSEMBLY_TEXT = [
  "reportedFailure",
  "wearRingClearanceCasing",
  "wearRingClearanceImpeller",
  "impellerToCasingClearance",
  "shaftRunoutTir",
  "shaftSleeveOd",
  "bearingJournalDiaDe",
  "bearingJournalDiaOde",
  "bearingHousingBoreDe",
  "bearingHousingBoreOde",
  "endplay",
  "casingBore",
  "impellerSettingLift",
  "couplingGap",
  "hydrostaticTestPressure",
  "hydrostaticHoldTime",
  "hydrostaticResult",
  "dyePenetrant",
  "magneticParticle",
  "utCasingThicknessMin",
  "balanceAsFound",
  "partsDamagedOrMissing",
  "partsToOrder",
  "recommendedRepairs",
  "photosTaken",
  "notes",
];

const PUMP_ASSEMBLY_TEXT = [
  "partsReplaced",
  "impellerTrimmedToDiameter",
  "casingRepairedOrCoated",
  "shaftReplacedOrMachined",
  "workNotes",
  "wearRingClearanceCasing",
  "wearRingClearanceImpeller",
  "impellerToCasingClearance",
  "shaftRunout",
  "endplay",
  "impellerSettingLift",
  "couplingGap",
  "sealMakeModel",
  "sealSerialNo",
  "packingInstalled",
  "flushPlanVerified",
  "hydrostaticTestPressure",
  "hydrostaticResult",
  "balanceGradeAchieved",
  "alignmentAngular",
  "alignmentParallel",
  "spinRunTestSpeed",
  "testFlow",
  "testHead",
  "testAmps",
  "vibrationOverall",
  "vibration1x",
  "bearingTempDe",
  "bearingTempOde",
  "sealLeakage",
  "runTime",
  "testResult",
  "date",
  "technicianName",
  "incomingPaint",
  "outgoingPaint",
  "notes",
];

const PUMP_ZERO_KEYS = new Set();

function emptyPumpDisassembly(overrides = {}) {
  const checks = {};
  for (const item of PUMP_FAILURE_CHECKS) checks[item.key] = "false";
  const visual = {};
  for (const row of PUMP_VISUAL_ROWS) visual[row.key] = "";
  return strMap(
    [...PUMP_DISASSEMBLY_TEXT, ...PUMP_FAILURE_CHECKS.map((x) => x.key), ...PUMP_VISUAL_ROWS.map((x) => x.key)],
    overrides,
    { ...checks, ...visual }
  );
}

function emptyPumpAssembly(overrides = {}) {
  return strMap(PUMP_ASSEMBLY_TEXT.concat(["paintAndPreparedToShip"]), overrides, {
    paintAndPreparedToShip: "false",
  });
}

function emptyPumpDataSheet(overrides = {}) {
  return { ...blankFieldMap(PUMP_DATASHEET_FIELD_COLUMNS), notes: "", ...(overrides && typeof overrides === "object" ? overrides : {}) };
}

export function createEmptyPumpDatasheet(overrides = {}) {
  const src = overrides && typeof overrides === "object" ? overrides : {};
  const { dataSheet, disassembly, assembly, ...rest } = src;
  const section = String(rest.section || "Complete Pump").trim() || "Complete Pump";
  const visible = pumpDatasheetVisibleTabs(section);
  const requested = String(rest.activeTab || "").trim();
  return {
    date: todayISODate(),
    technician: "",
    jobNumber: "",
    company: "",
    ...rest,
    section,
    activeTab: visible.includes(requested) ? requested : visible[0],
    dataSheet: emptyPumpDataSheet(dataSheet),
    disassembly: emptyPumpDisassembly(disassembly),
    assembly: emptyPumpAssembly(assembly),
  };
}

export function normalizePumpDatasheet(raw) {
  return createEmptyPumpDatasheet(raw && typeof raw === "object" ? raw : {});
}

export function pumpDatasheetHasData(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  const normalized = normalizePumpDatasheet(sheet);
  if (columnHasData(normalized.dataSheet, PUMP_DATASHEET_FIELD_COLUMNS)) return true;
  const checkKeys = new Set([...PUMP_FAILURE_CHECKS.map((x) => x.key), "paintAndPreparedToShip"]);
  if (blockHasMeaningful(normalized.disassembly, Object.keys(emptyPumpDisassembly()), PUMP_ZERO_KEYS, checkKeys)) {
    return true;
  }
  if (blockHasMeaningful(normalized.assembly, Object.keys(emptyPumpAssembly()), PUMP_ZERO_KEYS, checkKeys)) {
    return true;
  }
  return false;
}

export function buildPumpDatasheetFromProposal(proposalForm, meta = {}) {
  const f = proposalForm || {};
  const base = normalizePumpDatasheet(f.pumpDatasheet && typeof f.pumpDatasheet === "object" ? f.pumpDatasheet : {});
  const dataSheet = fillBlankFields(base.dataSheet, {
    make: String(f.manufacturer || "").trim(),
    model: String(f.modelNumber || "").trim(),
    power_required: String(f.hpKw || "").trim(),
    pump_type: String(f.frameType || "").trim(),
    rated_speed: String(f.rpm || "").trim(),
    impeller_dia: String(f.cd || "").trim(),
    no_of_vanes: String(f.bars || "").trim(),
  });
  const assembly = fillBlankFields(base.assembly, {
    incomingPaint: String(f.motorPaint || "").trim(),
  });
  return normalizePumpDatasheet({
    ...base,
    ...bindHeader(base, f, meta),
    dataSheet,
    assembly,
  });
}

export const PUMP_DISASSEMBLY_GROUPS = [
  { title: "Visual status", type: "goodBad", rows: PUMP_VISUAL_ROWS },
  { title: "Reported failure", type: "textarea", key: "reportedFailure", label: "Reason for removal" },
  { title: "Failure mode", type: "checks", items: PUMP_FAILURE_CHECKS },
  {
    title: "Measurements as found",
    type: "fields",
    fields: [
      ["wearRingClearanceCasing", "Wear Ring Clearance, Casing"],
      ["wearRingClearanceImpeller", "Wear Ring Clearance, Impeller"],
      ["impellerToCasingClearance", "Impeller-to-Casing Clearance"],
      ["shaftRunoutTir", "Shaft Runout (TIR)"],
      ["shaftSleeveOd", "Shaft Sleeve OD"],
      ["bearingJournalDiaDe", "Bearing Journal Dia. DE"],
      ["bearingJournalDiaOde", "Bearing Journal Dia. ODE"],
      ["bearingHousingBoreDe", "Bearing Housing Bore DE"],
      ["bearingHousingBoreOde", "Bearing Housing Bore ODE"],
      ["endplay", "Endplay"],
      ["casingBore", "Casing Bore"],
      ["impellerSettingLift", "Impeller Setting / Lift"],
      ["couplingGap", "Coupling Gap"],
    ],
  },
  {
    title: "Tests as found",
    type: "fields",
    fields: [
      ["hydrostaticTestPressure", "Hydrostatic Test Pressure"],
      ["hydrostaticHoldTime", "Hydrostatic Hold Time"],
      ["hydrostaticResult", "Hydrostatic Result"],
      ["dyePenetrant", "Dye Penetrant"],
      ["magneticParticle", "Magnetic Particle"],
      ["utCasingThicknessMin", "UT Casing Thickness, min"],
      ["balanceAsFound", "Balance As Found"],
    ],
  },
  {
    title: "Closing",
    type: "fields",
    fields: [
      ["partsDamagedOrMissing", "Parts damaged or missing"],
      ["partsToOrder", "Parts to order"],
      ["recommendedRepairs", "Recommended repairs"],
      ["photosTaken", "Photos taken"],
    ],
  },
  { title: "Notes", type: "textarea", key: "notes", label: "Notes" },
];

export const PUMP_ASSEMBLY_GROUPS = [
  {
    title: "Work done",
    type: "fields",
    fields: [
      ["partsReplaced", "Parts replaced"],
      ["impellerTrimmedToDiameter", "Impeller trimmed to diameter"],
      ["casingRepairedOrCoated", "Casing repaired or coated"],
      ["shaftReplacedOrMachined", "Shaft replaced or machined"],
      ["workNotes", "Notes"],
    ],
  },
  {
    title: "Clearances as left",
    type: "fields",
    fields: [
      ["wearRingClearanceCasing", "Wear Ring Clearance, Casing"],
      ["wearRingClearanceImpeller", "Wear Ring Clearance, Impeller"],
      ["impellerToCasingClearance", "Impeller-to-Casing Clearance"],
      ["shaftRunout", "Shaft Runout"],
      ["endplay", "Endplay"],
      ["impellerSettingLift", "Impeller Setting / Lift"],
      ["couplingGap", "Coupling Gap"],
    ],
  },
  {
    title: "Sealing installed",
    type: "fields",
    fields: [
      ["sealMakeModel", "Seal Make / Model"],
      ["sealSerialNo", "Seal Serial No."],
      ["packingInstalled", "Packing Installed"],
      ["flushPlanVerified", "Flush Plan Verified"],
    ],
  },
  {
    title: "Final tests",
    type: "fields",
    fields: [
      ["hydrostaticTestPressure", "Hydrostatic Test Pressure"],
      ["hydrostaticResult", "Hydrostatic Result"],
      ["balanceGradeAchieved", "Balance Grade Achieved"],
      ["alignmentAngular", "Alignment, Angular"],
      ["alignmentParallel", "Alignment, Parallel"],
      ["spinRunTestSpeed", "Spin / Run Test Speed (RPM)"],
      ["testFlow", "Test Flow"],
      ["testHead", "Test Head"],
      ["testAmps", "Test Amps"],
      ["vibrationOverall", "Vibration Overall"],
      ["vibration1x", "Vibration 1x"],
      ["bearingTempDe", "Bearing Temp DE"],
      ["bearingTempOde", "Bearing Temp ODE"],
      ["sealLeakage", "Seal Leakage"],
      ["runTime", "Run Time"],
      ["testResult", "Test Result"],
    ],
  },
  {
    title: "Closing",
    type: "fields",
    fields: [
      ["date", "Date"],
      ["technicianName", "Technician"],
      ["incomingPaint", "Incoming Paint"],
      ["outgoingPaint", "Outgoing Paint"],
    ],
  },
  { title: "Prepared to ship", type: "checks", items: [{ key: "paintAndPreparedToShip", label: "Painted and Prepared to Ship" }] },
  { title: "Notes", type: "textarea", key: "notes", label: "Notes" },
];

export const GENERATOR_DATASHEET_SECTIONS = ["Complete Generator", "Stator Only", "Rotor Only"];
export const GENERATOR_TAB_DATASHEET = "DataSheet";
export const GENERATOR_TAB_ROTOR = "Rotor & Exciter";
export const GENERATOR_TAB_DISASSEMBLY = "Disassembly";
export const GENERATOR_TAB_ASSEMBLY = "Assembly";

export function generatorDatasheetVisibleTabs(section) {
  const s = String(section || "").trim();
  if (s === "Stator Only") return [GENERATOR_TAB_DATASHEET, GENERATOR_TAB_DISASSEMBLY, GENERATOR_TAB_ASSEMBLY];
  if (s === "Rotor Only") return [GENERATOR_TAB_ROTOR, GENERATOR_TAB_DISASSEMBLY, GENERATOR_TAB_ASSEMBLY];
  return [GENERATOR_TAB_DATASHEET, GENERATOR_TAB_ROTOR, GENERATOR_TAB_DISASSEMBLY, GENERATOR_TAB_ASSEMBLY];
}

export const GENERATOR_DATASHEET_FIELD_COLUMNS = [
  [
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "serial_no", label: "Serial No." },
    { key: "generator_type", label: "Generator Type" },
    { key: "kva", label: "kVA" },
    { key: "kw", label: "kW" },
    { key: "power_factor", label: "Power Factor" },
    { key: "volts", label: "Volts" },
    { key: "amps", label: "Amps" },
    { key: "phase", label: "Phase" },
    { key: "hz", label: "HZ" },
    { key: "rpm", label: "RPM" },
    { key: "poles", label: "Poles" },
    { key: "connection", label: "Connection" },
    { key: "duty_rating", label: "Duty Rating" },
  ],
  [
    { key: "slots", label: "Slots" },
    { key: "coils", label: "Coils" },
    { key: "grouping", label: "Grouping" },
    { key: "span", label: "Span" },
    { key: "turns", label: "Turns" },
    { key: "wire_size", label: "Wire Size" },
    { key: "wire_in_hand", label: "Wire in Hand" },
    { key: "conn", label: "Conn." },
    { key: "jumper", label: "Jumper" },
    { key: "conn_end", label: "Conn. End" },
    { key: "wind_end", label: "Opposite Connection End" },
    { key: "winding_pitch", label: "Winding Pitch" },
    { key: "lead_length", label: "Lead Length" },
    { key: "no_of_leads", label: "No. of Leads" },
    { key: "leads_numbered_as", label: "Leads Numbered As" },
  ],
  [
    { key: "core_length", label: "Core Length" },
    { key: "core_dia", label: "Core Dia." },
    { key: "b_iron", label: "B. Iron" },
    { key: "sl_depth", label: "Slot Depth" },
    { key: "t_width", label: "Tooth Width" },
    { key: "wire_lbs", label: "Wire lbs." },
    { key: "insulation_class_stator", label: "Insulation Class, Stator" },
    { key: "insulation_class_rotor", label: "Insulation Class, Rotor" },
    { key: "temp_rise", label: "Temp Rise" },
    { key: "enclosure_ip", label: "Enclosure / IP" },
    { key: "bearing_de", label: "Bearing DE" },
    { key: "bearing_ode", label: "Bearing ODE" },
    { key: "no_of_bearings", label: "No. of Bearings" },
    { key: "coupling_flange", label: "Coupling / Flange" },
    { key: "air_gap_design", label: "Air Gap (design)" },
  ],
];

export const GENERATOR_COLUMN_TITLES = ["Nameplate and rating", "Stator winding", "Core and mechanical"];

export const GENERATOR_ROTOR_COLUMNS = [
  [
    { key: "rotor_type", label: "Rotor Type" },
    { key: "no_of_poles", label: "No. of Poles" },
    { key: "no_of_field_coils", label: "No. of Field Coils" },
    { key: "turns_per_pole", label: "Turns per Pole" },
    { key: "field_wire_size", label: "Field Wire Size" },
    { key: "field_resistance", label: "Field Resistance" },
    { key: "damper_winding", label: "Damper Winding" },
    { key: "slip_rings", label: "Slip Rings" },
    { key: "rotor_core_length", label: "Rotor Core Length" },
    { key: "rotor_dia", label: "Rotor Dia." },
  ],
  [
    { key: "excitation_type", label: "Excitation Type" },
    { key: "avr_make_model", label: "AVR Make / Model" },
    { key: "avr_settings", label: "AVR Settings" },
    { key: "pmg_output", label: "PMG Output" },
    { key: "exciter_stator_resistance", label: "Exciter Stator Resistance" },
    { key: "exciter_rotor_resistance", label: "Exciter Rotor Resistance" },
    { key: "exciter_volts", label: "Exciter Volts" },
    { key: "exciter_amps", label: "Exciter Amps" },
    { key: "rotating_rectifier", label: "Rotating Rectifier" },
    { key: "varistor_surge_suppressor", label: "Varistor / Surge Suppressor" },
  ],
  [],
];

export const GENERATOR_VISUAL_ROWS = [
  { key: "statorWindingStatus", label: "Stator Winding" },
  { key: "statorLeadsStatus", label: "Stator Leads" },
  { key: "coreIronStatus", label: "Core Iron" },
  { key: "frameStatus", label: "Frame" },
  { key: "rotorPolesStatus", label: "Rotor Poles" },
  { key: "fieldCoilsStatus", label: "Field Coils" },
  { key: "slipRingsStatus", label: "Slip Rings" },
  { key: "bearingsStatus", label: "Bearings" },
  { key: "exciterStatus", label: "Exciter" },
  { key: "rotatingRectifierStatus", label: "Rotating Rectifier" },
];

export const GENERATOR_FAILURE_CHECKS = [
  { key: "failPhaseToGround", label: "Phase to Ground" },
  { key: "failPhaseToPhase", label: "Phase to Phase" },
  { key: "failTurnToTurn", label: "Turn to Turn" },
  { key: "failCoilToCoil", label: "Coil to Coil" },
  { key: "failSinglePhased", label: "Single Phased" },
  { key: "failFieldCoilOpen", label: "Field Coil Open" },
  { key: "failFieldCoilShorted", label: "Field Coil Shorted" },
  { key: "failDiode", label: "Diode Failure" },
  { key: "failAvr", label: "AVR Failure" },
  { key: "failBearing", label: "Bearing Failure" },
  { key: "failOverheated", label: "Overheated" },
  { key: "failMechanicalDamage", label: "Mechanical Damage" },
];

export const GENERATOR_LOAD_TEST_KEYS = [
  "loadBankMethod",
  "load25Kw",
  "load25Volts",
  "load25Amps",
  "load25Pf",
  "load25Hz",
  "load50Kw",
  "load50Volts",
  "load50Amps",
  "load50Pf",
  "load50Hz",
  "load75Kw",
  "load75Volts",
  "load75Amps",
  "load75Pf",
  "load75Hz",
  "load100Kw",
  "load100Volts",
  "load100Amps",
  "load100Pf",
  "load100Hz",
  "voltageRegulationPct",
  "frequencyDroop",
  "tempRiseFullLoad",
  "avrResponse",
  "transientRecoveryTime",
  "overspeedTest",
];

const GEN_DISASSEMBLY_TEXT = [
  "reportedFailure",
  "statorIrLL",
  "statorIrLG",
  "pi1Min",
  "pi10Min",
  "piRatio",
  "rotorFieldIr",
  "windingResistanceU",
  "windingResistanceV",
  "windingResistanceW",
  "fieldWindingResistance",
  "exciterWindingResistance",
  "diodeForward",
  "diodeReverse",
  "hipotVoltage",
  "hipotLeakage",
  "hipotResult",
  "surgeVoltage",
  "surgeResult",
  "coreLossWatts",
  "coreLossTempRise",
  "airGap1",
  "airGap2",
  "airGap3",
  "airGap4",
  "shaftRunout",
  "bearingFitDe",
  "bearingFitOde",
  "endplay",
  "rotorFitDe",
  "rotorFitOde",
  "partsDamagedOrMissing",
  "partsToOrder",
  "recommendedRepairs",
  "photosTaken",
  "notes",
];

const GEN_ASSEMBLY_TEXT = [
  "statorIrLL",
  "statorIrLG",
  "pi1Min",
  "pi10Min",
  "piRatio",
  "windingResistanceU",
  "windingResistanceV",
  "windingResistanceW",
  "fieldResistance",
  "hipotVoltage",
  "hipotLeakage",
  "hipotResult",
  "surgeVoltage",
  "surgeResult",
  "airGap1",
  "airGap2",
  "airGap3",
  "airGap4",
  "shaftRunout",
  "endplay",
  "balanceGradeAchieved",
  "testSpeedRpm",
  "residualVoltage",
  "excitationVolts",
  "excitationAmps",
  "outputVoltsL1L2",
  "outputVoltsL2L3",
  "outputVoltsL3L1",
  "voltageBalancePct",
  "frequency",
  "waveformThdPct",
  "phaseRotation",
  "vibrationOverall",
  "bearingTempDe",
  "bearingTempOde",
  "runTime",
  ...GENERATOR_LOAD_TEST_KEYS,
  "date",
  "technicianName",
  "incomingPaint",
  "outgoingPaint",
  "testResult",
  "notes",
];

function emptyGeneratorDisassembly(overrides = {}) {
  const checks = {};
  for (const item of GENERATOR_FAILURE_CHECKS) checks[item.key] = "false";
  const visual = {};
  for (const row of GENERATOR_VISUAL_ROWS) visual[row.key] = "";
  return strMap(
    [
      ...GEN_DISASSEMBLY_TEXT,
      ...GENERATOR_FAILURE_CHECKS.map((x) => x.key),
      ...GENERATOR_VISUAL_ROWS.map((x) => x.key),
    ],
    overrides,
    { ...checks, ...visual }
  );
}

function emptyGeneratorAssembly(overrides = {}) {
  const base = strMap(GEN_ASSEMBLY_TEXT.concat(["paintAndPreparedToShip", "loadTestPerformed"]), overrides, {
    paintAndPreparedToShip: "false",
    loadTestPerformed: "false",
  });
  if (String(base.loadTestPerformed || "").toLowerCase() !== "true") {
    for (const key of GENERATOR_LOAD_TEST_KEYS) base[key] = "";
    base.loadTestPerformed = "false";
  } else {
    base.loadTestPerformed = "true";
  }
  return base;
}

function emptyGeneratorDataSheet(overrides = {}) {
  const block = {
    ...blankFieldMap(GENERATOR_DATASHEET_FIELD_COLUMNS),
    no_of_bearings: "0",
    notes: "",
  };
  const src = overrides && typeof overrides === "object" ? overrides : {};
  for (const key of Object.keys(block)) {
    if (src[key] != null && String(src[key]) !== "") block[key] = String(src[key]);
  }
  if (!String(block.no_of_bearings || "").trim()) block.no_of_bearings = "0";
  return block;
}

function emptyRotorExciter(overrides = {}) {
  return { ...blankFieldMap(GENERATOR_ROTOR_COLUMNS), notes: "", ...(overrides && typeof overrides === "object" ? overrides : {}) };
}

export function createEmptyGeneratorDatasheet(overrides = {}) {
  const src = overrides && typeof overrides === "object" ? overrides : {};
  const { dataSheet, rotorExciter, disassembly, assembly, ...rest } = src;
  const section = String(rest.section || "Complete Generator").trim() || "Complete Generator";
  const visible = generatorDatasheetVisibleTabs(section);
  const requested = String(rest.activeTab || "").trim();
  return {
    date: todayISODate(),
    technician: "",
    jobNumber: "",
    company: "",
    ...rest,
    section,
    activeTab: visible.includes(requested) ? requested : visible[0],
    dataSheet: emptyGeneratorDataSheet(dataSheet),
    rotorExciter: emptyRotorExciter(rotorExciter),
    disassembly: emptyGeneratorDisassembly(disassembly),
    assembly: emptyGeneratorAssembly(assembly),
  };
}

export function normalizeGeneratorDatasheet(raw) {
  return createEmptyGeneratorDatasheet(raw && typeof raw === "object" ? raw : {});
}

export function generatorDatasheetHasData(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  const normalized = normalizeGeneratorDatasheet(sheet);
  if (columnHasData(normalized.dataSheet, GENERATOR_DATASHEET_FIELD_COLUMNS)) return true;
  if (columnHasData(normalized.rotorExciter, GENERATOR_ROTOR_COLUMNS)) return true;
  const checkKeys = new Set([
    ...GENERATOR_FAILURE_CHECKS.map((x) => x.key),
    "paintAndPreparedToShip",
    "loadTestPerformed",
  ]);
  const zeroKeys = new Set(["no_of_bearings"]);
  if (blockHasMeaningful(normalized.disassembly, Object.keys(emptyGeneratorDisassembly()), zeroKeys, checkKeys)) {
    return true;
  }
  if (blockHasMeaningful(normalized.assembly, Object.keys(emptyGeneratorAssembly()), zeroKeys, checkKeys)) {
    return true;
  }
  return false;
}

export function buildGeneratorDatasheetFromProposal(proposalForm, meta = {}) {
  const f = proposalForm || {};
  const base = normalizeGeneratorDatasheet(
    f.generatorDatasheet && typeof f.generatorDatasheet === "object" ? f.generatorDatasheet : {}
  );
  const dataSheet = fillBlankFields(base.dataSheet, {
    make: String(f.manufacturer || "").trim(),
    model: String(f.modelNumber || "").trim(),
    kw: String(f.hpKw || "").trim(),
    enclosure_ip: String(f.frameType || "").trim(),
    volts: String(f.volts || "").trim(),
    amps: String(f.amps || "").trim(),
    rpm: String(f.rpm || "").trim(),
    slots: String(f.sl || "").trim(),
    core_length: String(f.cl || "").trim(),
    core_dia: String(f.cd || "").trim(),
  });
  const assembly = fillBlankFields(base.assembly, {
    incomingPaint: String(f.motorPaint || "").trim(),
  });
  return normalizeGeneratorDatasheet({
    ...base,
    ...bindHeader(base, f, meta),
    dataSheet,
    assembly,
  });
}

export const GENERATOR_DISASSEMBLY_GROUPS = [
  { title: "Visual status", type: "goodBad", rows: GENERATOR_VISUAL_ROWS },
  { title: "Reported failure", type: "textarea", key: "reportedFailure", label: "Reported failure" },
  { title: "Failure mode", type: "checks", items: GENERATOR_FAILURE_CHECKS },
  {
    title: "Electrical tests as found",
    type: "fields",
    fields: [
      ["statorIrLL", "Stator IR, L-L"],
      ["statorIrLG", "Stator IR, L-G"],
      ["pi1Min", "Polarization Index, 1 min"],
      ["pi10Min", "Polarization Index, 10 min"],
      ["piRatio", "PI Ratio"],
      ["rotorFieldIr", "Rotor / Field IR"],
      ["windingResistanceU", "Winding Resistance U"],
      ["windingResistanceV", "Winding Resistance V"],
      ["windingResistanceW", "Winding Resistance W"],
      ["fieldWindingResistance", "Field Winding Resistance"],
      ["exciterWindingResistance", "Exciter Winding Resistance"],
      ["diodeForward", "Diode Test, Forward"],
      ["diodeReverse", "Diode Test, Reverse"],
      ["hipotVoltage", "Hipot Voltage"],
      ["hipotLeakage", "Hipot Leakage"],
      ["hipotResult", "Hipot Result"],
      ["surgeVoltage", "Surge Voltage"],
      ["surgeResult", "Surge Result"],
      ["coreLossWatts", "Core Loss, watts"],
      ["coreLossTempRise", "Core Loss, temperature rise"],
    ],
  },
  {
    title: "Mechanical as found",
    type: "fields",
    fields: [
      ["airGap1", "Air Gap point 1"],
      ["airGap2", "Air Gap point 2"],
      ["airGap3", "Air Gap point 3"],
      ["airGap4", "Air Gap point 4"],
      ["shaftRunout", "Shaft Runout"],
      ["bearingFitDe", "Bearing Fit DE"],
      ["bearingFitOde", "Bearing Fit ODE"],
      ["endplay", "Endplay"],
      ["rotorFitDe", "Rotor Fit DE"],
      ["rotorFitOde", "Rotor Fit ODE"],
    ],
  },
  {
    title: "Closing",
    type: "fields",
    fields: [
      ["partsDamagedOrMissing", "Parts damaged or missing"],
      ["partsToOrder", "Parts to order"],
      ["recommendedRepairs", "Recommended repairs"],
      ["photosTaken", "Photos taken"],
    ],
  },
  { title: "Notes", type: "textarea", key: "notes", label: "Notes" },
];

const LOAD_STEP_FIELDS = (pct, prefix) => [
  [`${prefix}Kw`, `${pct}% kW`],
  [`${prefix}Volts`, `${pct}% Volts`],
  [`${prefix}Amps`, `${pct}% Amps`],
  [`${prefix}Pf`, `${pct}% PF`],
  [`${prefix}Hz`, `${pct}% Hz`],
];

export const GENERATOR_ASSEMBLY_GROUPS = [
  {
    title: "Post-repair electrical",
    type: "fields",
    fields: [
      ["statorIrLL", "Stator IR, L-L"],
      ["statorIrLG", "Stator IR, L-G"],
      ["pi1Min", "Polarization Index, 1 min"],
      ["pi10Min", "Polarization Index, 10 min"],
      ["piRatio", "PI Ratio"],
      ["windingResistanceU", "Winding Resistance U"],
      ["windingResistanceV", "Winding Resistance V"],
      ["windingResistanceW", "Winding Resistance W"],
      ["fieldResistance", "Field Resistance"],
      ["hipotVoltage", "Hipot Voltage"],
      ["hipotLeakage", "Hipot Leakage"],
      ["hipotResult", "Hipot Result"],
      ["surgeVoltage", "Surge Voltage"],
      ["surgeResult", "Surge Result"],
    ],
  },
  {
    title: "Mechanical as left",
    type: "fields",
    fields: [
      ["airGap1", "Air Gap point 1"],
      ["airGap2", "Air Gap point 2"],
      ["airGap3", "Air Gap point 3"],
      ["airGap4", "Air Gap point 4"],
      ["shaftRunout", "Shaft Runout"],
      ["endplay", "Endplay"],
      ["balanceGradeAchieved", "Balance Grade Achieved"],
    ],
  },
  {
    title: "No-load run test",
    type: "fields",
    fields: [
      ["testSpeedRpm", "Test Speed (RPM)"],
      ["residualVoltage", "Residual Voltage"],
      ["excitationVolts", "Excitation Volts"],
      ["excitationAmps", "Excitation Amps"],
      ["outputVoltsL1L2", "Output Volts L1-L2"],
      ["outputVoltsL2L3", "Output Volts L2-L3"],
      ["outputVoltsL3L1", "Output Volts L3-L1"],
      ["voltageBalancePct", "Voltage Balance %"],
      ["frequency", "Frequency"],
      ["waveformThdPct", "Waveform / THD %"],
      ["phaseRotation", "Phase Rotation"],
      ["vibrationOverall", "Vibration Overall"],
      ["bearingTempDe", "Bearing Temp DE"],
      ["bearingTempOde", "Bearing Temp ODE"],
      ["runTime", "Run Time"],
    ],
  },
  { title: "Load test", type: "checks", items: [{ key: "loadTestPerformed", label: "Load Test Performed" }] },
  {
    title: "Load test readings",
    type: "fields",
    whenKey: "loadTestPerformed",
    fields: [
      ["loadBankMethod", "Load Bank / Method"],
      ...LOAD_STEP_FIELDS("25", "load25"),
      ...LOAD_STEP_FIELDS("50", "load50"),
      ...LOAD_STEP_FIELDS("75", "load75"),
      ...LOAD_STEP_FIELDS("100", "load100"),
      ["voltageRegulationPct", "Voltage Regulation %"],
      ["frequencyDroop", "Frequency Droop"],
      ["tempRiseFullLoad", "Temp Rise at Full Load"],
      ["avrResponse", "AVR Response"],
      ["transientRecoveryTime", "Transient Response / Recovery Time"],
      ["overspeedTest", "Overspeed Test"],
    ],
  },
  {
    title: "Closing",
    type: "fields",
    fields: [
      ["date", "Date"],
      ["technicianName", "Technician"],
      ["incomingPaint", "Incoming Paint"],
      ["outgoingPaint", "Outgoing Paint"],
      ["testResult", "Test Result"],
    ],
  },
  { title: "Prepared to ship", type: "checks", items: [{ key: "paintAndPreparedToShip", label: "Painted and Prepared to Ship" }] },
  { title: "Notes", type: "textarea", key: "notes", label: "Notes" },
];
