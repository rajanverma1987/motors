import {
  AC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  DC_WORK_ORDER_FIELDS,
  emptySpecsFromFields,
} from "@/lib/work-order-fields";

export function mergeSpecsFromMotor(stored, fieldList) {
  const base = emptySpecsFromFields(fieldList);
  if (!stored || typeof stored !== "object") return base;
  for (const { key } of fieldList) {
    if (stored[key] != null && String(stored[key]).trim() !== "") base[key] = String(stored[key]);
  }
  return base;
}

export function motorApiToForm(data) {
  const d = data || {};
  return {
    customerId: d.customerId ?? "",
    serialNumber: d.serialNumber ?? "",
    manufacturer: d.manufacturer ?? "",
    model: d.model ?? "",
    hp: d.hp ?? "",
    rpm: d.rpm ?? "",
    voltage: d.voltage ?? "",
    kw: d.kw ?? "",
    amps: d.amps ?? "",
    frameSize: d.frameSize ?? "",
    motorType: d.motorType ?? "",
    slots: d.slots ?? "",
    coreLength: d.coreLength ?? "",
    coreDiameter: d.coreDiameter ?? "",
    bars: d.bars ?? "",
    notes: d.notes ?? "",
    acSpecs: mergeSpecsFromMotor(d.acSpecs, AC_WORK_ORDER_FIELDS),
    dcSpecs: mergeSpecsFromMotor(d.dcSpecs, DC_WORK_ORDER_FIELDS),
    dcArmatureSpecs: mergeSpecsFromMotor(d.dcArmatureSpecs, DC_ARMATURE_FIELDS),
  };
}

export function buildMotorPayload(form) {
  const f = form || {};
  return {
    customerId: f.customerId ?? "",
    serialNumber: f.serialNumber ?? "",
    manufacturer: f.manufacturer ?? "",
    model: f.model ?? "",
    hp: f.hp ?? "",
    rpm: f.rpm ?? "",
    voltage: f.voltage ?? "",
    kw: f.kw ?? "",
    amps: f.amps ?? "",
    frameSize: f.frameSize ?? "",
    motorType: f.motorType ?? "",
    slots: f.slots ?? "",
    coreLength: f.coreLength ?? "",
    coreDiameter: f.coreDiameter ?? "",
    bars: f.bars ?? "",
    motorPhotos: Array.isArray(f.motorPhotos) ? f.motorPhotos : [],
    nameplateImages: Array.isArray(f.nameplateImages) ? f.nameplateImages : [],
    notes: f.notes ?? "",
    acSpecs: f.acSpecs && typeof f.acSpecs === "object" ? f.acSpecs : {},
    dcSpecs: f.dcSpecs && typeof f.dcSpecs === "object" ? f.dcSpecs : {},
    dcArmatureSpecs: f.dcArmatureSpecs && typeof f.dcArmatureSpecs === "object" ? f.dcArmatureSpecs : {},
  };
}

export function isAcMotorType(t) {
  return String(t || "").toUpperCase() === "AC";
}

export function isDcMotorType(t) {
  return String(t || "").toUpperCase() === "DC";
}
