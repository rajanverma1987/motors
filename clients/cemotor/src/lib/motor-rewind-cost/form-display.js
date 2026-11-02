/** Display labels for marketing rewind calculator form fields. */

export function phaseLabel(phase) {
  if (String(phase) === "1") return "Single-phase";
  if (String(phase) === "3") return "Three-phase";
  return String(phase || "—");
}

export function coilTypeLabel(coilType) {
  const c = String(coilType || "");
  if (c === "lap") return "Lap";
  if (c === "wave") return "Wave";
  if (c === "concentric") return "Concentric";
  return c || "—";
}

export function rpmDisplayLabel(rpm) {
  const r = rpm != null ? String(rpm).trim() : "";
  return r || "1800 (typical)";
}

export function visitorTypeLabel(visitorType) {
  if (visitorType === "motor_repair_shop") return "Motor repair shop";
  if (visitorType === "end_user") return "End user";
  return String(visitorType || "—");
}

/**
 * @param {Record<string, string>} form
 * @returns {{ label: string, value: string }[]}
 */
export function calculatorFormRows(form) {
  const f = form || {};
  const rating =
    f.ratingUnit === "kw"
      ? `${f.kw || "—"} kW`
      : `${f.hp || "—"} HP`;
  const rows = [
    { label: "Motor rating", value: rating },
    { label: "Phase", value: phaseLabel(f.phase) },
    { label: "RPM", value: rpmDisplayLabel(f.rpm) },
    { label: "Voltage (nameplate)", value: f.voltage ? `${f.voltage} V` : "—" },
    { label: "Stator slots", value: f.slots ? `${f.slots} slots` : "—" },
    { label: "Coil type", value: coilTypeLabel(f.coilType) },
    { label: "Magnet wire (AWG)", value: f.wireGauge ? `AWG ${f.wireGauge}` : "—" },
  ];
  if (f.manualCuKg && String(f.manualCuKg).trim()) {
    rows.push({ label: "Copper weight (entered)", value: `${String(f.manualCuKg).trim()} kg` });
  }
  return rows;
}
