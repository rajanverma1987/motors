/** Field keys + labels for AC / DC / Armature work order forms (values stored on WO + merged to Motor). */

export const AC_WORK_ORDER_FIELDS = [
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
  { key: "wdg_type", label: "Wdg Type" },
  { key: "slots", label: "Slots" },
  { key: "coils", label: "Coils" },
  { key: "grouping", label: "Grouping" },
  { key: "turns", label: "Turns" },
  { key: "wire_size", label: "Wire Size" },
  { key: "wire_in_hand", label: "Wire in Hand" },
  { key: "span", label: "Span" },
  { key: "conn", label: "Conn." },
  { key: "jumper", label: "Jumper" },
  { key: "conn_end", label: "Conn. End" },
  { key: "wind_end", label: "Wind End" },
  { key: "lead_length", label: "Lead/Length" },
  { key: "core_length", label: "Core Length" },
  { key: "core_dia", label: "Core Dia." },
  { key: "b_iron", label: "B. Iron" },
  { key: "sl_depth", label: "Sl. Depth" },
  { key: "t_width", label: "T. Width" },
  { key: "lugs_hole_size", label: "Lugs/Hole Size" },
  { key: "overloads", label: "Overloads" },
  { key: "therm", label: "Therm." },
  { key: "heaters", label: "Heaters" },
  { key: "head_size", label: "Head Size" },
  { key: "distance", label: "Distance" },
  { key: "wire_lbs", label: "Wire lbs." },
];

/** Keys already shown under motor Identification & specs — hide from “Others” on motor detail. */
export const AC_WORK_ORDER_KEYS_OVERLAPPING_MOTOR_ASSETS = new Set([
  "hp",
  "make",
  "model",
  "frame",
  "type",
  "volts",
  "amps",
  "rpm",
  "slots",
  "core_length",
  "core_dia",
]);

export const DC_WORK_ORDER_FIELDS = [
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
  { key: "inside_diameter", label: "Inside Diameter" },
  { key: "shunt_pole_dim", label: "Shunt Pole Dim." },
  { key: "i_pole_dim", label: "I-pole Dim." },
  { key: "shunt_wire_lbs", label: "Shunt Wire LBS" },
  { key: "i_pole_wire_lbs", label: "I-pole Wire LBS" },
  { key: "shunt_lead_marking", label: "Shunt Lead Marking" },
  { key: "i_pole_lead_markings", label: "I-pole Lead Markings" },
  { key: "i_pole_turns", label: "I-pole Turns" },
];

/** DC work order keys already in Identification & specs — hide from “Others” on motor detail. */
const DC_WORK_ORDER_KEYS_OVERLAPPING_MOTOR_ASSETS = new Set([
  "hp",
  "make",
  "model",
  "frame",
  "type",
  "volts",
  "amps",
  "rpm",
]);

/** DC “Others” section: DC WO fields excluding duplicates of Identification & specs. */
export const DC_OTHERS_FIELDS = DC_WORK_ORDER_FIELDS.filter(
  (f) => !DC_WORK_ORDER_KEYS_OVERLAPPING_MOTOR_ASSETS.has(f.key)
);

export const DC_ARMATURE_FIELDS = [
  { key: "hp", label: "HP" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "frame", label: "Frame" },
  { key: "type", label: "Type" },
  { key: "volts", label: "Volts" },
  { key: "amps", label: "Amps" },
  { key: "rpm", label: "Rpm" },
  { key: "poles", label: "Poles" },
  { key: "span", label: "Span" },
  { key: "turns", label: "Turns" },
  { key: "conn", label: "Conn." },
  { key: "eq", label: "Eq." },
  { key: "conn_end", label: "Conn. End" },
  { key: "wind_end", label: "Wind. End" },
  { key: "wires_in_coil", label: "Wires In Coil" },
  { key: "wires_in_hand", label: "Wires In Hand" },
  { key: "wire_size", label: "Wire Size" },
  { key: "fan", label: "Fan" },
  { key: "comm_part_no", label: "Comm Part#" },
  { key: "coil_type", label: "Coil Type" },
  { key: "slots", label: "Slots" },
  { key: "bars", label: "Bars" },
  { key: "iron_l", label: "Iron L." },
  { key: "iron_diam", label: "Iron Diam." },
  { key: "br_surf_l", label: "BR.Surf. L." },
  { key: "br_surf_d", label: "BR. Surf. D" },
  { key: "riser_diam", label: "Riser Diam." },
  { key: "stack_teosh", label: "Stack T.E.O.SH:" },
  { key: "stack_to_riser", label: "Stack to Riser:" },
  { key: "copper_teosh", label: "Copper T.E.O SH:" },
  { key: "total_wires_in_riser", label: "Total Wires In Riser" },
  { key: "total_wires_riser_height", label: "Total Wires In Riser — Height" },
  { key: "total_wires_riser_width", label: "Total Wires In Riser — Width" },
];

/** Armature “Armature data” on motor detail: exclude fields already in Identification & specs. */
export const DC_ARMATURE_OTHERS_FIELDS = DC_ARMATURE_FIELDS.filter(
  (f) => !DC_WORK_ORDER_KEYS_OVERLAPPING_MOTOR_ASSETS.has(f.key)
);

export const JOB_TYPE_OPTIONS = [
  { value: "complete_motor", label: "Complete Motor" },
  { value: "field_frame_only", label: "Field Frame Only" },
];

export const DEFAULT_WORK_ORDER_STATUSES = [
  "Assigned",
  "In Progress",
  "Waiting Parts",
  "QC",
  "Completed",
];

/** @param {string} motorType */
export function motorClassFromMotorType(motorType) {
  const t = String(motorType || "").toLowerCase();
  if (/\bdc\b|direct\s*current|d\.c\./i.test(t)) return "DC";
  return "AC";
}

export function emptySpecsFromFields(fieldList) {
  const o = {};
  for (const { key } of fieldList) o[key] = "";
  return o;
}

export function prefillSpecsFromMotor(motor, fieldList) {
  const m = motor || {};
  const out = emptySpecsFromFields(fieldList);
  const map = {
    hp: m.hp,
    make: m.manufacturer,
    model: m.model,
    frame: m.frameSize,
    volts: m.voltage,
    amps: m.amps,
    rpm: m.rpm,
    type: m.motorType,
    slots: m.slots,
    core_length: m.coreLength,
    core_dia: m.coreDiameter,
    bars: m.bars,
  };
  for (const { key } of fieldList) {
    if (map[key] != null && String(map[key]).trim() !== "") out[key] = String(map[key]).trim();
  }
  return out;
}
