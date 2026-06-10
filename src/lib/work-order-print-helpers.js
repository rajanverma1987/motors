import {
  AC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  DC_WORK_ORDER_FIELDS,
  normalizeWorkOrderJobType,
} from "@/lib/work-order-fields";
import { getMotorInspectionViewEntries } from "@/lib/motor-inspection-fields";
import { formatDateMdy } from "@/lib/format-date";

/** @param {unknown} value */
export function normalizedMotorClass(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

/**
 * All spec fields for print (empty values shown as —).
 * @param {{ key: string, label: string }[]} fields
 * @param {object} [specs]
 */
export function specRowsAll(fields, specs) {
  const bag = specs && typeof specs === "object" ? specs : {};
  return fields.map(({ key, label }) => {
    const v = String(bag[key] ?? "").trim();
    return { label, value: v || "—" };
  });
}

/** @param {string} [kind] */
export function inspectionKindLabel(kind) {
  if (kind === "preliminary") return "Pre-inspection";
  if (kind === "detailed") return "Detailed inspection";
  return kind ? String(kind) : "Inspection";
}

/**
 * @param {Array<{ kind?: string, createdAt?: string, findings?: object }>} inspections
 */
export function sortInspectionsForPrint(inspections) {
  return [...(inspections || [])].sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

/**
 * @param {object} [findings]
 */
export function inspectionFindingRows(findings) {
  return getMotorInspectionViewEntries(findings);
}

/** Armature print fields — skip keys already listed on the DC motor section. */
function armatureFieldsForPrint(jobType) {
  if (jobType === "armature_only") return DC_ARMATURE_FIELDS;
  const dcMotorKeys = new Set(DC_WORK_ORDER_FIELDS.map((f) => f.key));
  return DC_ARMATURE_FIELDS.filter((f) => !dcMotorKeys.has(f.key));
}

/**
 * Motor spec sections for print/PDF (no duplicate fields across DC motor / armature).
 * @param {object} data
 */
export function motorSpecSectionsForPrint(data) {
  const motorClass = normalizedMotorClass(data?.motorClass);
  const jobType = normalizeWorkOrderJobType(data?.jobType, motorClass);
  const sections = [];
  if (motorClass === "AC") {
    sections.push({
      title: "AC motor — winding & mechanical",
      rows: specRowsAll(AC_WORK_ORDER_FIELDS, data?.acSpecs),
    });
  }
  if (motorClass === "DC") {
    if (jobType !== "armature_only") {
      sections.push({
        title: "DC motor",
        rows: specRowsAll(DC_WORK_ORDER_FIELDS, data?.dcSpecs),
      });
    }
    sections.push({
      title: "Armature",
      rows: specRowsAll(armatureFieldsForPrint(jobType), data?.armatureSpecs),
    });
  }
  return sections;
}

/**
 * @param {Array<{ kind?: string, createdAt?: string, findings?: object }>} inspections
 */
export function inspectionsSectionsForPrint(inspections) {
  return sortInspectionsForPrint(inspections).map((insp, index) => {
    const recorded = insp?.createdAt ? formatDateMdy(insp.createdAt) : "—";
    return {
      title: `${inspectionKindLabel(insp?.kind)} (${recorded})`,
      rows: inspectionFindingRows(insp?.findings).map(({ label, text }) => ({
        label,
        value: text || "—",
      })),
      key: insp?.id || `insp-${index}`,
    };
  });
}
