import { normalizeCirMillsUnit } from "@/lib/platform-cir-mills";

const MAX_SELECTED_WIRES = 10;
const MAX_ORIGINAL_QTYS = 24;

function cleanText(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resultKeyPart(row, index) {
  const size = row?.[`wireSize${index}`];
  const qty = finiteNumber(row?.[`wires${index}`]);
  if (!qty || size == null || size === "" || size === 0) return "";
  return `${size} x ${qty}`;
}

/** Stable id for a best-match row (up to three wire sizes). */
export function cmJobResultKey(row) {
  if (!row || typeof row !== "object") return "";
  return [1, 2, 3]
    .map((index) => {
      const size = row[`wireSize${index}`];
      const qty = finiteNumber(row[`wires${index}`]);
      if (!qty || size == null || size === "") return "";
      return `${size}:${qty}`;
    })
    .filter(Boolean)
    .join("|");
}

export function formatCmJobResultSummary(calc) {
  const row = calc?.selectedResult;
  if (!row || typeof row !== "object") return "";
  const parts = [1, 2, 3].map((index) => resultKeyPart(row, index)).filter(Boolean);
  const total = finiteNumber(row.totalCM);
  const pct = Number(row.percentDifference);
  const bits = [];
  if (parts.length) bits.push(parts.join(", "));
  if (total) bits.push(`${total} CM`);
  if (Number.isFinite(pct)) bits.push(`${pct > 0 ? "+" : ""}${pct}%`);
  return bits.join(", ");
}

function normalizeSelectedResult(raw) {
  if (!raw || typeof raw !== "object") return null;
  const row = {
    wireSize1: raw.wireSize1 ?? "",
    wires1: finiteNumber(raw.wires1),
    wireSize2: raw.wireSize2 ?? "",
    wires2: finiteNumber(raw.wires2),
    wireSize3: raw.wireSize3 ?? "",
    wires3: finiteNumber(raw.wires3),
    totalCM: finiteNumber(raw.totalCM),
    targetedCM: finiteNumber(raw.targetedCM),
    wiresInHand: finiteNumber(raw.wiresInHand),
    percentDifference: finiteNumber(raw.percentDifference),
    cmDifference: finiteNumber(raw.cmDifference),
    noOfWires: finiteNumber(raw.noOfWires),
  };
  if (!cmJobResultKey(row) && !row.totalCM) return null;
  return row;
}

function normalizeQtyMap(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = cleanText(key, 80);
    if (!id) continue;
    out[id] = cleanText(value, 12);
    if (Object.keys(out).length >= MAX_ORIGINAL_QTYS) break;
  }
  return out;
}

function normalizeResultContext(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    originalWiredInHand: cleanText(raw.originalWiredInHand, 40),
    originalWireSize: cleanText(raw.originalWireSize, 300),
    originalCMDisplay: cleanText(raw.originalCMDisplay, 40),
    targetedCM: cleanText(raw.targetedCM, 40),
    minWires: cleanText(raw.minWires, 12),
    maxWires: cleanText(raw.maxWires, 12),
    selectedCatalogSummary: cleanText(raw.selectedCatalogSummary, 2000),
  };
}

/**
 * Snapshot stored on a service proposal so a CM Best Match can be reopened later.
 * @param {unknown} raw
 */
export function normalizeCmJobCalculation(raw) {
  if (!raw || typeof raw !== "object") return null;
  const selectedResult = normalizeSelectedResult(raw.selectedResult);
  const targetedCM = cleanText(raw.targetedCM, 40);
  const originalCM = cleanText(raw.originalCM, 40);
  if (!selectedResult && !targetedCM && !originalCM) return null;
  const ids = Array.isArray(raw.selectedWireIds)
    ? raw.selectedWireIds.map((id) => cleanText(id, 80)).filter(Boolean).slice(0, MAX_SELECTED_WIRES)
    : [];
  return {
    savedAt: cleanText(raw.savedAt, 40),
    catalogWireUnit: normalizeCirMillsUnit(raw.catalogWireUnit),
    selectedWireIds: ids,
    originalWiredInHand: cleanText(raw.originalWiredInHand, 40),
    originalWireSize: cleanText(raw.originalWireSize, 300),
    originalCM,
    targetedCM,
    minWires: cleanText(raw.minWires, 12) || "3",
    maxWires: cleanText(raw.maxWires, 12) || "10",
    originalWireQtys: normalizeQtyMap(raw.originalWireQtys),
    resultContext: normalizeResultContext(raw.resultContext),
    selectedResult,
  };
}
