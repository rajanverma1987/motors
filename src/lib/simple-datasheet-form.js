/** Simple portal AC / DC datasheet shapes (linked to a service proposal job). */

import { todayISODate } from "@/lib/simple-service-proposal-form";

/** @type {{ key: string, label: string }[][]} */
export const AC_DATASHEET_FIELD_COLUMNS = [
  [
    { key: "hp", label: "HP" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "frame", label: "Frame" },
    { key: "type", label: "Type" },
    { key: "volts", label: "Volts" },
    { key: "amps", label: "Amps" },
    { key: "rpm", label: "Rpm" },
    { key: "poles", label: "Poles" },
    { key: "hz", label: "HZ" },
    { key: "phase", label: "Phase" },
    { key: "wdg_type", label: "Winding Type" },
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
    { key: "lugs_hole_size", label: "Lugs Size / Hole Size" },
    { key: "overloads", label: "Overloads" },
    { key: "therm", label: "Themrister" },
    { key: "heaters", label: "Heaters" },
    { key: "head_size", label: "Head Size" },
    { key: "distance", label: "Distance" },
    { key: "wire_lbs", label: "Wire lbs." },
  ],
];

export const AC_DATASHEET_SECTIONS = ["Complete Motor", "Field Frame"];
export const AC_DATASHEET_TAB_DATASHEET = "DataSheet";
export const AC_DATASHEET_TAB_DISASSEMBLY = "Disassembly";
export const AC_DATASHEET_TAB_ASSEMBLY = "Assembly";

/**
 * Which AC tabs are visible for the radio section.
 * Complete Motor → DataSheet + Disassembly + Assembly.
 * Field Frame → DataSheet only (no tab stripe in UI).
 * @param {string} section
 * @returns {string[]}
 */
export function acDatasheetVisibleTabs(section) {
  const s = String(section || "").trim();
  if (s === "Complete Motor") {
    return [AC_DATASHEET_TAB_DATASHEET, AC_DATASHEET_TAB_DISASSEMBLY, AC_DATASHEET_TAB_ASSEMBLY];
  }
  return [AC_DATASHEET_TAB_DATASHEET];
}

/** @type {{ key: string, label: string }[][]} */
export const DC_FIELD_FRAME_FIELD_COLUMNS = [
  [
    { key: "hp", label: "HP" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "frame", label: "Frame" },
    { key: "type", label: "Type" },
    { key: "volts", label: "Volts" },
    { key: "amps", label: "Amps" },
    { key: "rpm", label: "Rpm" },
    { key: "poles", label: "Poles" },
    { key: "shunt_turns", label: "Shunt Turns" },
    { key: "no_of_shunts", label: "No of Shunt's" },
  ],
  [
    { key: "connection", label: "Connection" },
    { key: "shunt_wires_size", label: "Shunt# Wires & Size" },
    { key: "i_pole_wires_size", label: "I-pole# Wires & Size" },
    { key: "conn_end", label: "Conn End" },
    { key: "wind_end", label: "Wind End" },
    { key: "lead_length", label: "Lead Length" },
    { key: "lugs_hole_size", label: "Lugs Hole Size" },
    { key: "overloads", label: "OverLoads" },
    { key: "thermistors", label: "Thermistors" },
    { key: "core_length", label: "Core Length" },
  ],
  [
    { key: "inside_diameter", label: "Inside Diameter" },
    { key: "shunt_pole_dim", label: "Shunt Pole Dim." },
    { key: "i_pole_dim", label: "I-pole Dim." },
    { key: "shunt_wire_lbs", label: "Shunt Wire LBS" },
    { key: "i_pole_wire_lbs", label: "I-pole Wire LBS" },
    { key: "shunt_lead_marking", label: "Shunt Lead Marking" },
    { key: "i_pole_lead_markings", label: "I-pole Lead Markings" },
    { key: "i_pole_turns", label: "I-pole Turns" },
    { key: "cm", label: "CM" },
  ],
];

/** @deprecated Use DC_FIELD_FRAME_FIELD_COLUMNS */
export const DC_DATASHEET_FIELD_COLUMNS = DC_FIELD_FRAME_FIELD_COLUMNS;

/** Armature tab fields (documents/Armature.png). */
/** @type {{ key: string, label: string }[][]} */
export const DC_ARMATURE_FIELD_COLUMNS = [
  [
    { key: "hp", label: "HP" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "frame", label: "Frame" },
    { key: "type", label: "Type" },
    { key: "volts", label: "Volts" },
    { key: "amps", label: "Amps" },
    { key: "rpm", label: "Rpm" },
    { key: "poles", label: "Poles" },
  ],
  [
    { key: "span", label: "Span" },
    { key: "turns", label: "Turns" },
    { key: "conn", label: "Conn." },
    { key: "eq", label: "Eq." },
    { key: "conn_end", label: "Conn. End" },
    { key: "opp_conn_end", label: "Opp. Conn. End" },
    { key: "wires_in_coil", label: "Wires In Coil" },
    { key: "wires_in_hand", label: "Wires In Hand" },
    { key: "wire_size", label: "Wire Size" },
    { key: "fan", label: "Fan" },
    { key: "comm_part_no", label: "Comm Part#" },
    { key: "coil_type", label: "Coil Type" },
  ],
  [
    { key: "slots", label: "Slots" },
    { key: "bars", label: "Bars" },
    { key: "iron_l", label: "Iron L." },
    { key: "iron_diam", label: "Iron Diam." },
    { key: "br_surf_l", label: "BR.Surf. L" },
    { key: "br_surf_d", label: "BR.Surf. D" },
    { key: "riser_diam", label: "Riser Diam." },
    { key: "stack_teosh", label: "Stack T.E.O.SH." },
    { key: "stack_to_riser", label: "Stack to Riser" },
    { key: "copper_teosh", label: "Copper T.E.O SH." },
    { key: "total_wires_in_riser", label: "Total Wires In Riser" },
    { key: "w", label: "W" },
    { key: "h", label: "H" },
  ],
];

export const DC_DATASHEET_SECTIONS = ["Complete Motor", "Field Frame", "Armature"];
export const DC_DATASHEET_TAB_FIELD_FRAME = "Field Frame";
export const DC_DATASHEET_TAB_ARMATURE = "Armature";

/**
 * Which DC tabs are visible for the radio section.
 * @param {string} section
 * @returns {string[]}
 */
export function dcDatasheetVisibleTabs(section) {
  const s = String(section || "").trim();
  if (s === "Field Frame") return [DC_DATASHEET_TAB_FIELD_FRAME];
  if (s === "Armature") return [DC_DATASHEET_TAB_ARMATURE];
  return [DC_DATASHEET_TAB_FIELD_FRAME, DC_DATASHEET_TAB_ARMATURE];
}

function blankFieldMap(columns) {
  const out = {};
  for (const col of columns) {
    for (const f of col) out[f.key] = "";
  }
  return out;
}

/** Flatten `{key,label}[][]` to a single list (order preserved). */
export function flattenDatasheetFieldColumns(columns) {
  const out = [];
  for (const col of Array.isArray(columns) ? columns : []) {
    for (const f of Array.isArray(col) ? col : []) {
      if (f?.key) out.push({ key: String(f.key), label: String(f.label || f.key) });
    }
  }
  return out;
}

/** Empty criteria map for a datasheet column config (no notes). */
export function createEmptyDatasheetCriteria(columns) {
  return blankFieldMap(columns);
}

/**
 * Master Data Search form definitions — always driven by the same column arrays
 * as the Datasheet modal so field adds/renames stay in sync.
 *
 * @type {Record<string, {
 *   id: string,
 *   label: string,
 *   blocks: { id: string, label: string, mongoPrefix: string, columns: { key: string, label: string }[][] }[]
 * }>}
 */
export const MASTER_DATA_SEARCH_FORMS = {
  ac: {
    id: "ac",
    label: "AC",
    blocks: [
      {
        id: "dataSheet",
        label: "Complete Motor",
        mongoPrefix: "acDatasheet.dataSheet",
        columns: AC_DATASHEET_FIELD_COLUMNS,
      },
    ],
  },
  dc: {
    id: "dc",
    label: "DC",
    blocks: [
      {
        id: "fieldFrame",
        label: "Field Frame",
        mongoPrefix: "dcDatasheet.fieldFrame",
        columns: DC_FIELD_FRAME_FIELD_COLUMNS,
      },
      {
        id: "armature",
        label: "Armature",
        mongoPrefix: "dcDatasheet.armature",
        columns: DC_ARMATURE_FIELD_COLUMNS,
      },
    ],
  },
  armature: {
    id: "armature",
    label: "Armature",
    blocks: [
      {
        id: "armature",
        label: "Armature",
        mongoPrefix: "dcDatasheet.armature",
        columns: DC_ARMATURE_FIELD_COLUMNS,
      },
    ],
  },
  customer: {
    id: "customer",
    label: "Search By Customer",
    searchType: "customer",
    fields: [
      { key: "companyName", label: "Customer Name" },
      { key: "primaryContactName", label: "Contact Name" },
    ],
  },
};

export const MASTER_DATA_SEARCH_FORM_IDS = Object.keys(MASTER_DATA_SEARCH_FORMS);

function emptyFieldFrameBlock(overrides = {}) {
  return {
    ...blankFieldMap(DC_FIELD_FRAME_FIELD_COLUMNS),
    notes: "",
    ...overrides,
  };
}

function emptyArmatureBlock(overrides = {}) {
  return {
    ...blankFieldMap(DC_ARMATURE_FIELD_COLUMNS),
    notes: "",
    ...overrides,
  };
}

/**
 * Migrate legacy flat DC datasheet (pre Field Frame / Armature split) into nested shape.
 * @param {Record<string, unknown>} raw
 */
export function normalizeDcDatasheet(raw) {
  const base = createEmptyDcDatasheet();
  if (!raw || typeof raw !== "object") return base;

  const hasNested =
    (raw.fieldFrame && typeof raw.fieldFrame === "object") ||
    (raw.armature && typeof raw.armature === "object");

  if (hasNested) {
    return createEmptyDcDatasheet({
      ...raw,
      fieldFrame: emptyFieldFrameBlock(raw.fieldFrame || {}),
      armature: emptyArmatureBlock(raw.armature || {}),
      activeTab: dcDatasheetVisibleTabs(raw.section).includes(raw.activeTab)
        ? raw.activeTab
        : dcDatasheetVisibleTabs(raw.section)[0],
    });
  }

  // Legacy flat field-frame fields at root
  const fieldFrame = emptyFieldFrameBlock();
  for (const col of DC_FIELD_FRAME_FIELD_COLUMNS) {
    for (const f of col) {
      if (raw[f.key] != null) fieldFrame[f.key] = String(raw[f.key] ?? "");
    }
  }
  if (raw.notes != null) fieldFrame.notes = String(raw.notes ?? "");

  return createEmptyDcDatasheet({
    date: raw.date,
    technician: raw.technician,
    jobNumber: raw.jobNumber,
    company: raw.company,
    section: raw.section || "Complete Motor",
    fieldFrame,
    armature: emptyArmatureBlock(),
  });
}

function emptyAcDataSheetBlock(overrides = {}) {
  return {
    ...blankFieldMap(AC_DATASHEET_FIELD_COLUMNS),
    notes: "",
    ...overrides,
  };
}

export const AC_DISASSEMBLY_SURGE_FAILURE_KEYS = [
  { key: "surgeFailCoilToCoil", label: "Surge Fail Coil To Coil" },
  { key: "surgeFailTurnToTurn", label: "Surge Fail Turn To Turn" },
  { key: "surgeFailPhaseToPhase", label: "Surge Fail Phase To Phase" },
  { key: "surgeFailPhaseToGround", label: "Surge Fail Phase To Ground" },
  { key: "surgeFailSinglePhased", label: "Surge Fail Single Phased" },
];

/** Visual Status Good/Bad rows on AC Disassembly tab. */
export const AC_DISASSEMBLY_VISUAL_STATUS_ROWS = [
  { key: "windingStatus", label: "Winding Status" },
  { key: "leadsStatus", label: "Leads Status" },
  { key: "coreIronStatus", label: "Core Iron" },
  { key: "frameStatus", label: "Frame" },
];

function emptyAcDisassemblyBlock(overrides = {}) {
  const base = {
    visualStatus: "",
    windingStatus: "",
    leadsStatus: "",
    coreIronStatus: "",
    frameStatus: "",
    visualStatusNotes: "",
    status: "",
    markedMotorSides: "",
    markedMotorSidesF1: "false",
    markedMotorSidesF2: "false",
    markedMotorSidesNotes: "",
    junctionBoxLocation: "",
    brokenPartsNotes: "",
    endBellFitDE: "",
    endBellFitODE: "",
    rotorFitDE: "",
    rotorFitODE: "",
    shaftRunout: "",
    numberOfBearings: "0",
    numberOfBearingsDE: "0",
    numberOfBearingsODE: "0",
    bearingSizeDE: "",
    bearingSizeODE: "",
    sealSizeDE: "",
    sealSizeODE: "",
    otherNotes: "",
    maggerVoltage: "0",
    maggerMicroAmps: "0",
    maggerTest: "",
    highPotVoltage: "0",
    highPotMicroAmps: "0",
    highPotTest: "",
    surgeVoltage: "0",
    surgeTest: "",
    surgeFailCoilToCoil: "false",
    surgeFailTurnToTurn: "false",
    surgeFailPhaseToPhase: "false",
    surgeFailPhaseToGround: "false",
    surgeFailSinglePhased: "false",
    finalNotes: "",
  };
  return { ...base, ...(overrides && typeof overrides === "object" ? overrides : {}) };
}

function emptyAcAssemblyBlock(overrides = {}) {
  const base = {
    date: "",
    technicianName: "",
    maggerVoltage: "0",
    maggerMicroAmps: "0",
    maggerTest: "",
    highPotVoltage: "0",
    highPotMicroAmps: "0",
    highPotTest: "",
    surgeVoltage: "0",
    surgeTest: "",
    surgeFailCoilToCoil: "false",
    surgeFailTurnToTurn: "false",
    surgeFailPhaseToPhase: "false",
    surgeFailPhaseToGround: "false",
    surgeFailSinglePhased: "false",
    voltageTest: "",
    rpm: "",
    lead1Amp: "",
    lead2Amp: "",
    lead3Amp: "",
    paintAndPreparedToShip: "false",
    motorIncomingPaint: "",
    motorOutgoingPaint: "",
    notes: "",
  };
  return { ...base, ...(overrides && typeof overrides === "object" ? overrides : {}) };
}

/**
 * Migrate legacy flat AC datasheet into nested DataSheet / Disassembly / Assembly shape.
 * @param {Record<string, unknown>} raw
 */
export function normalizeAcDatasheet(raw) {
  const base = createEmptyAcDatasheet();
  if (!raw || typeof raw !== "object") return base;

  const hasNested =
    (raw.dataSheet && typeof raw.dataSheet === "object") ||
    (raw.disassembly && typeof raw.disassembly === "object") ||
    (raw.assembly && typeof raw.assembly === "object");

  if (hasNested) {
    return createEmptyAcDatasheet({
      ...raw,
      dataSheet: emptyAcDataSheetBlock(raw.dataSheet || {}),
      disassembly: emptyAcDisassemblyBlock(raw.disassembly || {}),
      assembly: emptyAcAssemblyBlock(raw.assembly || {}),
      activeTab: acDatasheetVisibleTabs(raw.section).includes(raw.activeTab)
        ? raw.activeTab
        : acDatasheetVisibleTabs(raw.section)[0],
    });
  }

  const dataSheet = emptyAcDataSheetBlock();
  for (const col of AC_DATASHEET_FIELD_COLUMNS) {
    for (const f of col) {
      if (raw[f.key] != null) dataSheet[f.key] = String(raw[f.key] ?? "");
    }
  }
  if (raw.notes != null) dataSheet.notes = String(raw.notes ?? "");

  return createEmptyAcDatasheet({
    date: raw.date,
    technician: raw.technician,
    jobNumber: raw.jobNumber,
    company: raw.company,
    section: raw.section || "Complete Motor",
    dataSheet,
    disassembly: emptyAcDisassemblyBlock(),
    assembly: emptyAcAssemblyBlock(),
  });
}

export function createEmptyAcDatasheet(overrides = {}) {
  const src = overrides && typeof overrides === "object" ? overrides : {};
  const {
    dataSheet: dsOverride,
    disassembly: disOverride,
    assembly: asmOverride,
    ...rest
  } = src;
  const section = String(rest.section || "Complete Motor").trim() || "Complete Motor";
  const visible = acDatasheetVisibleTabs(section);
  const requestedTab = String(rest.activeTab || "").trim();
  const activeTab = visible.includes(requestedTab) ? requestedTab : visible[0];
  return {
    date: todayISODate(),
    technician: "",
    jobNumber: "",
    company: "",
    section: "Complete Motor",
    activeTab: AC_DATASHEET_TAB_DATASHEET,
    ...rest,
    section,
    activeTab,
    dataSheet: emptyAcDataSheetBlock(dsOverride && typeof dsOverride === "object" ? dsOverride : {}),
    disassembly: emptyAcDisassemblyBlock(disOverride && typeof disOverride === "object" ? disOverride : {}),
    assembly: emptyAcAssemblyBlock(asmOverride && typeof asmOverride === "object" ? asmOverride : {}),
  };
}

export function createEmptyDcDatasheet(overrides = {}) {
  const src = overrides && typeof overrides === "object" ? overrides : {};
  const { fieldFrame: ffOverride, armature: armOverride, ...rest } = src;
  const section = String(rest.section || "Complete Motor").trim() || "Complete Motor";
  const visible = dcDatasheetVisibleTabs(section);
  const requestedTab = String(rest.activeTab || "").trim();
  const activeTab = visible.includes(requestedTab) ? requestedTab : visible[0];
  return {
    date: todayISODate(),
    technician: "",
    jobNumber: "",
    company: "",
    section: "Complete Motor",
    activeTab: DC_DATASHEET_TAB_FIELD_FRAME,
    ...rest,
    section,
    activeTab,
    fieldFrame: emptyFieldFrameBlock(ffOverride && typeof ffOverride === "object" ? ffOverride : {}),
    armature: emptyArmatureBlock(armOverride && typeof armOverride === "object" ? armOverride : {}),
  };
}

function blockHasTechnicalData(block, columns) {
  if (!block || typeof block !== "object") return false;
  for (const col of columns) {
    for (const f of col) {
      if (String(block[f.key] ?? "").trim()) return true;
    }
  }
  return Boolean(String(block.notes ?? "").trim());
}

/**
 * True when any technical / notes field has a value (header meta alone does not count).
 * @param {Record<string, unknown>|null|undefined} sheet
 * @param {"AC"|"DC"} motorType
 */
export function datasheetHasData(sheet, motorType) {
  if (!sheet || typeof sheet !== "object") return false;
  if (motorType === "DC") {
    if (sheet.fieldFrame || sheet.armature) {
      return (
        blockHasTechnicalData(sheet.fieldFrame, DC_FIELD_FRAME_FIELD_COLUMNS) ||
        blockHasTechnicalData(sheet.armature, DC_ARMATURE_FIELD_COLUMNS)
      );
    }
    for (const col of DC_FIELD_FRAME_FIELD_COLUMNS) {
      for (const f of col) {
        if (String(sheet[f.key] ?? "").trim()) return true;
      }
    }
    return Boolean(String(sheet.notes ?? "").trim());
  }
  if (sheet.dataSheet || sheet.disassembly || sheet.assembly) {
    const dis = sheet.disassembly || {};
    const asm = sheet.assembly || {};
    const disKeys = Object.keys(emptyAcDisassemblyBlock());
    const asmKeys = Object.keys(emptyAcAssemblyBlock());
    if (blockHasTechnicalData(sheet.dataSheet, AC_DATASHEET_FIELD_COLUMNS)) return true;
    for (const k of disKeys) {
      if (k === "numberOfBearings" || k === "maggerVoltage" || k === "maggerMicroAmps" || k === "surgeVoltage") {
        const v = String(dis[k] ?? "").trim();
        if (v && v !== "0" && v !== "false") return true;
        continue;
      }
      if (k.startsWith("surgeFail")) {
        if (String(dis[k] ?? "").trim().toLowerCase() === "true") return true;
        continue;
      }
      if (String(dis[k] ?? "").trim()) return true;
    }
    for (const k of asmKeys) {
      if (k === "paintAndPreparedToShip") {
        if (String(asm[k] ?? "").trim().toLowerCase() === "true") return true;
        continue;
      }
      if (String(asm[k] ?? "").trim()) return true;
    }
    return false;
  }
  for (const col of AC_DATASHEET_FIELD_COLUMNS) {
    for (const f of col) {
      if (String(sheet[f.key] ?? "").trim()) return true;
    }
  }
  return Boolean(String(sheet.notes ?? "").trim());
}

/**
 * Prefill datasheet from service proposal motor / header fields when opening empty sheet.
 * @param {Record<string, unknown>} proposalForm
 * @param {{ companyName?: string, technicianLabel?: string }} [meta]
 */
export function buildAcDatasheetFromProposal(proposalForm, meta = {}) {
  const f = proposalForm || {};
  const existing = f.acDatasheet && typeof f.acDatasheet === "object" ? f.acDatasheet : null;
  if (datasheetHasData(existing, "AC")) {
    return normalizeAcDatasheet(existing);
  }

  const motorPrefill = {
    hp: String(f.hpKw || "").trim(),
    make: String(f.manufacturer || "").trim(),
    model: String(f.modelNumber || "").trim(),
    frame: String(f.frameType || "").trim(),
    volts: String(f.volts || "").trim(),
    amps: String(f.amps || "").trim(),
    rpm: String(f.rpm || "").trim(),
    slots: String(f.sl || "").trim(),
    core_length: String(f.cl || "").trim(),
    core_dia: String(f.cd || "").trim(),
  };

  return normalizeAcDatasheet({
    ...(existing || {}),
    date: String(existing?.date || f.dateCreated || todayISODate()).slice(0, 10),
    technician: String(existing?.technician || meta.technicianLabel || f.preparedBy || "").trim(),
    jobNumber: String(existing?.jobNumber || f.documentNumber || "").trim(),
    company: String(existing?.company || meta.companyName || "").trim(),
    dataSheet: {
      ...(existing?.dataSheet || {}),
      ...motorPrefill,
    },
  });
}

/**
 * @param {Record<string, unknown>} proposalForm
 * @param {{ companyName?: string, technicianLabel?: string }} [meta]
 */
export function buildDcDatasheetFromProposal(proposalForm, meta = {}) {
  const f = proposalForm || {};
  const existing = f.dcDatasheet && typeof f.dcDatasheet === "object" ? f.dcDatasheet : null;
  if (datasheetHasData(existing, "DC")) {
    return normalizeDcDatasheet(existing);
  }

  const motorPrefill = {
    hp: String(f.hpKw || "").trim(),
    make: String(f.manufacturer || "").trim(),
    model: String(f.modelNumber || "").trim(),
    frame: String(f.frameType || "").trim(),
    volts: String(f.volts || "").trim(),
    amps: String(f.amps || "").trim(),
    rpm: String(f.rpm || "").trim(),
  };

  return normalizeDcDatasheet({
    ...(existing || {}),
    date: String(existing?.date || f.dateCreated || todayISODate()).slice(0, 10),
    technician: String(existing?.technician || meta.technicianLabel || f.preparedBy || "").trim(),
    jobNumber: String(existing?.jobNumber || f.documentNumber || "").trim(),
    company: String(existing?.company || meta.companyName || "").trim(),
    fieldFrame: {
      ...(existing?.fieldFrame || {}),
      ...motorPrefill,
      core_length: String(existing?.fieldFrame?.core_length || f.cl || "").trim(),
      inside_diameter: String(existing?.fieldFrame?.inside_diameter || f.cd || "").trim(),
    },
    armature: {
      ...(existing?.armature || {}),
      ...motorPrefill,
      slots: String(existing?.armature?.slots || f.sl || "").trim(),
      bars: String(existing?.armature?.bars || f.bars || "").trim(),
      iron_l: String(existing?.armature?.iron_l || f.cl || "").trim(),
      iron_diam: String(existing?.armature?.iron_diam || f.cd || "").trim(),
    },
  });
}
