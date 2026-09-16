/**
 * IQMotorTrack datasheet storage and merge rules (§6.5, §9.8).
 *
 * The stored shape is byte-for-byte the IQMotorBase datasheet shape so values
 * round-trip losslessly: AC uses `dataSheet` / `disassembly` / `assembly`,
 * DC uses `fieldFrame` / `armature`.
 */

import {
  AC_DATASHEET_FIELD_COLUMNS,
  DC_ARMATURE_FIELD_COLUMNS,
  DC_FIELD_FRAME_FIELD_COLUMNS,
  createEmptyAcDatasheet,
  createEmptyDcDatasheet,
  flattenDatasheetFieldColumns,
  normalizeAcDatasheet,
  normalizeDcDatasheet,
} from "@/lib/simple-datasheet-form";

/** Blocks that hold plant-relevant technical values, per power type. */
const AC_BLOCKS = [{ key: "dataSheet", label: "DataSheet", columns: AC_DATASHEET_FIELD_COLUMNS }];
const DC_BLOCKS = [
  { key: "fieldFrame", label: "Field Frame", columns: DC_FIELD_FRAME_FIELD_COLUMNS },
  { key: "armature", label: "Armature", columns: DC_ARMATURE_FIELD_COLUMNS },
];

/** Four core measurements the shop keeps on the proposal itself (§9.8). */
export const TRACK_CORE_MEASUREMENT_FIELDS = [
  { proposalKey: "sl", label: "Slots", acKey: "dataSheet.slots", dcKey: "armature.slots" },
  {
    proposalKey: "cl",
    label: "Core Length",
    acKey: "dataSheet.core_length",
    dcKey: "fieldFrame.core_length",
  },
  {
    proposalKey: "cd",
    label: "Core Diameter",
    acKey: "dataSheet.core_dia",
    dcKey: "fieldFrame.inside_diameter",
  },
  { proposalKey: "bars", label: "Bars", acKey: "", dcKey: "armature.bars" },
];

/**
 * @param {"AC"|"DC"} powerType
 */
export function trackDatasheetBlocks(powerType) {
  return String(powerType).toUpperCase() === "DC" ? DC_BLOCKS : AC_BLOCKS;
}

/**
 * @param {"AC"|"DC"} powerType
 * @param {Record<string, unknown>} [overrides]
 */
export function createEmptyTrackDatasheet(powerType, overrides = {}) {
  return String(powerType).toUpperCase() === "DC"
    ? createEmptyDcDatasheet(overrides)
    : createEmptyAcDatasheet(overrides);
}

/**
 * @param {Record<string, unknown>|null|undefined} raw
 * @param {"AC"|"DC"} powerType
 */
export function normalizeTrackDatasheet(raw, powerType) {
  return String(powerType).toUpperCase() === "DC"
    ? normalizeDcDatasheet(raw || {})
    : normalizeAcDatasheet(raw || {});
}

function readPath(obj, path) {
  const [block, key] = String(path).split(".");
  if (!block || !key) return "";
  const node = obj && typeof obj === "object" ? obj[block] : null;
  if (!node || typeof node !== "object") return "";
  return String(node[key] ?? "").trim();
}

function writePath(obj, path, value) {
  const [block, key] = String(path).split(".");
  if (!block || !key) return;
  if (!obj[block] || typeof obj[block] !== "object") obj[block] = {};
  obj[block][key] = value;
}

/**
 * All editable field paths (`block.key`) with labels for a power type.
 * @param {"AC"|"DC"} powerType
 * @returns {{ path: string, blockKey: string, blockLabel: string, key: string, label: string }[]}
 */
export function trackDatasheetFieldPaths(powerType) {
  const out = [];
  for (const block of trackDatasheetBlocks(powerType)) {
    for (const field of flattenDatasheetFieldColumns(block.columns)) {
      out.push({
        path: `${block.key}.${field.key}`,
        blockKey: block.key,
        blockLabel: block.label,
        key: field.key,
        label: field.label,
      });
    }
  }
  return out;
}

/**
 * Flatten a stored datasheet into display rows with per-field provenance.
 * @param {Record<string, unknown>|null|undefined} data
 * @param {"AC"|"DC"} powerType
 * @param {Record<string, { source?: string, shopName?: string, jobNumber?: string, at?: string, previousValue?: string }>} [provenance]
 */
export function flattenTrackDatasheet(data, powerType, provenance = {}) {
  const sheet = normalizeTrackDatasheet(data, powerType);
  const groups = [];
  for (const block of trackDatasheetBlocks(powerType)) {
    const rows = [];
    for (const field of flattenDatasheetFieldColumns(block.columns)) {
      const path = `${block.key}.${field.key}`;
      const value = readPath(sheet, path);
      if (!value) continue;
      rows.push({
        path,
        label: field.label,
        value,
        provenance: (provenance && provenance[path]) || null,
      });
    }
    const notes = String(sheet?.[block.key]?.notes ?? "").trim();
    if (rows.length || notes) {
      groups.push({ blockKey: block.key, blockLabel: block.label, rows, notes });
    }
  }
  return groups;
}

/**
 * True when any technical value is present.
 * @param {Record<string, unknown>|null|undefined} data
 * @param {"AC"|"DC"} powerType
 */
export function trackDatasheetHasValues(data, powerType) {
  const sheet = normalizeTrackDatasheet(data, powerType);
  for (const field of trackDatasheetFieldPaths(powerType)) {
    if (readPath(sheet, field.path)) return true;
  }
  return false;
}

/**
 * Build a one-line provenance string for a datasheet version.
 * @param {{ sourceType?: string, sourceLabel?: string, jobNumber?: string, recordedAt?: Date|string|null }} version
 */
export function trackDatasheetProvenanceLine(version) {
  if (!version) return "";
  const who =
    version.sourceType === "shop"
      ? String(version.sourceLabel || "Shop").trim()
      : `${String(version.sourceLabel || "Plant").trim()} (plant entered)`;
  const job = String(version.jobNumber || "").trim();
  let when = "";
  try {
    when = version.recordedAt
      ? new Date(version.recordedAt).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
  } catch {
    when = "";
  }
  return [`Recorded by ${who}`, job ? `Job ${job}` : "", when].filter(Boolean).join(", ");
}

/**
 * Merge an incoming datasheet (usually from a shop write-back) into the current
 * IQMotorTrack values following the §9.8 table.
 *
 * - Track field empty                → fill it
 * - Values equal                     → no change, record a confirming source
 * - Values differ                    → take the shop value, keep the old one in provenance
 * - Incoming field blank             → ignore, a blank never erases known data
 *
 * @param {{
 *   current: Record<string, unknown>|null|undefined,
 *   currentProvenance?: Record<string, unknown>,
 *   incoming: Record<string, unknown>|null|undefined,
 *   powerType: "AC"|"DC",
 *   sourceType: "facility"|"shop",
 *   sourceLabel: string,
 *   jobNumber?: string,
 *   at?: Date,
 * }} args
 * @returns {{
 *   changed: boolean,
 *   data: Record<string, unknown>,
 *   fieldProvenance: Record<string, unknown>,
 *   changedFields: string[],
 *   confirmedFields: string[],
 * }}
 */
export function mergeTrackDatasheet({
  current,
  currentProvenance = {},
  incoming,
  powerType,
  sourceType,
  sourceLabel,
  jobNumber = "",
  at = new Date(),
}) {
  const merged = normalizeTrackDatasheet(current, powerType);
  const source = normalizeTrackDatasheet(incoming, powerType);
  const provenance = { ...(currentProvenance && typeof currentProvenance === "object" ? currentProvenance : {}) };
  const changedFields = [];
  const confirmedFields = [];
  const iso = new Date(at).toISOString();

  for (const field of trackDatasheetFieldPaths(powerType)) {
    const nextValue = readPath(source, field.path);
    if (!nextValue) continue;
    const prevValue = readPath(merged, field.path);

    if (prevValue === nextValue) {
      const existing = provenance[field.path] || {};
      const confirmedBy = Array.isArray(existing.confirmedBy) ? existing.confirmedBy.slice() : [];
      if (sourceLabel && !confirmedBy.includes(sourceLabel)) confirmedBy.push(sourceLabel);
      provenance[field.path] = { ...existing, confirmedBy };
      confirmedFields.push(field.path);
      continue;
    }

    writePath(merged, field.path, nextValue);
    provenance[field.path] = {
      source: sourceType,
      shopName: sourceType === "shop" ? sourceLabel : "",
      sourceLabel,
      jobNumber,
      at: iso,
      previousValue: prevValue,
      confirmedBy: [],
    };
    changedFields.push(field.path);
  }

  // Notes per block: append rather than overwrite so nothing is lost.
  for (const block of trackDatasheetBlocks(powerType)) {
    const incomingNotes = String(source?.[block.key]?.notes ?? "").trim();
    if (!incomingNotes) continue;
    const currentNotes = String(merged?.[block.key]?.notes ?? "").trim();
    if (currentNotes === incomingNotes) continue;
    if (!merged[block.key] || typeof merged[block.key] !== "object") merged[block.key] = {};
    merged[block.key].notes = currentNotes
      ? `${currentNotes}\n${sourceLabel}: ${incomingNotes}`
      : incomingNotes;
    changedFields.push(`${block.key}.notes`);
  }

  return {
    changed: changedFields.length > 0,
    data: merged,
    fieldProvenance: provenance,
    changedFields,
    confirmedFields,
  };
}

/**
 * Pull the four core measurements out of a datasheet so the shop proposal form
 * can be pre-filled (§9.5 motor field mapping).
 * @param {Record<string, unknown>|null|undefined} data
 * @param {"AC"|"DC"} powerType
 */
export function trackCoreMeasurementsFromDatasheet(data, powerType) {
  const sheet = normalizeTrackDatasheet(data, powerType);
  const isDc = String(powerType).toUpperCase() === "DC";
  const out = {};
  for (const field of TRACK_CORE_MEASUREMENT_FIELDS) {
    const path = isDc ? field.dcKey : field.acKey;
    if (!path) continue;
    const value = readPath(sheet, path);
    if (value) out[field.proposalKey] = value;
  }
  return out;
}

/**
 * Merge the four core measurements coming back from a proposal into a datasheet-shaped object
 * so they can flow through the standard merge rules.
 * @param {Record<string, unknown>} proposal
 * @param {"AC"|"DC"} powerType
 */
export function trackDatasheetFromCoreMeasurements(proposal, powerType) {
  const isDc = String(powerType).toUpperCase() === "DC";
  const out = createEmptyTrackDatasheet(powerType);
  for (const field of TRACK_CORE_MEASUREMENT_FIELDS) {
    const path = isDc ? field.dcKey : field.acKey;
    if (!path) continue;
    const value = String(proposal?.[field.proposalKey] ?? "").trim();
    if (value) writePath(out, path, value);
  }
  return out;
}
