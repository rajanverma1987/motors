import { connectDB } from "@/lib/db";
import PlatformCirMills from "@/models/PlatformCirMills";
import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  DEFAULT_CIR_MILLS_ROWS,
  DEFAULT_METRIC_CIR_MILLS_ROWS,
  normalizeCirMillsUnit,
} from "@/lib/platform-cir-mills";

async function dropLegacySizeUniqueIndex() {
  try {
    const indexes = await PlatformCirMills.collection.indexes();
    const legacy = indexes.find(
      (idx) =>
        idx.unique &&
        idx.key &&
        Object.keys(idx.key).length === 1 &&
        idx.key.size === 1
    );
    if (legacy?.name) {
      await PlatformCirMills.collection.dropIndex(legacy.name);
    }
  } catch {
    // ignore missing index
  }
}

/**
 * Ensure AWG + Metric Cir Mills tables exist and unit indexes are correct.
 * @returns {Promise<{ seededAwg: boolean, seededMetric: boolean, awgCount: number, metricCount: number }>}
 */
export async function ensurePlatformCirMillsSeeded() {
  await connectDB();
  await dropLegacySizeUniqueIndex();

  await PlatformCirMills.updateMany(
    { $or: [{ unit: { $exists: false } }, { unit: null }, { unit: "" }] },
    { $set: { unit: CIR_MILLS_UNIT_AWG } }
  );

  try {
    await PlatformCirMills.syncIndexes();
  } catch {
    // ignore race / duplicate during sync
  }

  let seededAwg = false;
  let seededMetric = false;

  const awgCount = await PlatformCirMills.countDocuments({ unit: CIR_MILLS_UNIT_AWG });
  if (awgCount === 0) {
    const docs = DEFAULT_CIR_MILLS_ROWS.map((row, index) => ({
      unit: CIR_MILLS_UNIT_AWG,
      size: String(row.size).trim(),
      circularMills: Number(row.circularMills),
      sortOrder: index,
      isActive: true,
    }));
    await PlatformCirMills.insertMany(docs);
    seededAwg = true;
  }

  const metricCount = await PlatformCirMills.countDocuments({ unit: CIR_MILLS_UNIT_METRIC });
  if (metricCount === 0) {
    const docs = DEFAULT_METRIC_CIR_MILLS_ROWS.map((row, index) => ({
      unit: CIR_MILLS_UNIT_METRIC,
      size: String(row.size).trim(),
      circularMills: Number(row.circularMills),
      sortOrder: index,
      isActive: true,
    }));
    await PlatformCirMills.insertMany(docs);
    seededMetric = true;
  }

  return {
    seededAwg,
    seededMetric,
    awgCount: seededAwg ? DEFAULT_CIR_MILLS_ROWS.length : awgCount,
    metricCount: seededMetric ? DEFAULT_METRIC_CIR_MILLS_ROWS.length : metricCount,
  };
}

export function serializeCirMillsDoc(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    unit: normalizeCirMillsUnit(doc.unit),
    size: String(doc.size || "").trim(),
    circularMills: Number(doc.circularMills) || 0,
    sortOrder: Number(doc.sortOrder) || 0,
    isActive: doc.isActive !== false,
    updatedAt: doc.updatedAt || null,
    createdAt: doc.createdAt || null,
  };
}

/**
 * Active rows for calculators (all SaaS users), filtered by measurement unit.
 * Sorted by wire size descending (numeric).
 * @param {string} [unit]
 */
export async function listActivePlatformCirMills(unit = CIR_MILLS_UNIT_AWG) {
  await ensurePlatformCirMillsSeeded();
  const u = normalizeCirMillsUnit(unit);
  const list = await PlatformCirMills.find({ isActive: true, unit: u })
    .sort({ sortOrder: 1, size: 1 })
    .lean();
  const items = list.map(serializeCirMillsDoc);
  items.sort((a, b) => {
    const na = Number.parseFloat(String(a?.size ?? "").replace(/,/g, ""));
    const nb = Number.parseFloat(String(b?.size ?? "").replace(/,/g, ""));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na;
    return String(b?.size ?? "").localeCompare(String(a?.size ?? ""), undefined, { numeric: true });
  });
  return items;
}

/** Rebuild both unit tables from bundled defaults (admin reset). */
export async function resetPlatformCirMillsToDefaults() {
  await connectDB();
  await dropLegacySizeUniqueIndex();
  await PlatformCirMills.deleteMany({});
  const awgDocs = DEFAULT_CIR_MILLS_ROWS.map((row, index) => ({
    unit: CIR_MILLS_UNIT_AWG,
    size: String(row.size).trim(),
    circularMills: Number(row.circularMills),
    sortOrder: index,
    isActive: true,
  }));
  const metricDocs = DEFAULT_METRIC_CIR_MILLS_ROWS.map((row, index) => ({
    unit: CIR_MILLS_UNIT_METRIC,
    size: String(row.size).trim(),
    circularMills: Number(row.circularMills),
    sortOrder: index,
    isActive: true,
  }));
  await PlatformCirMills.insertMany([...awgDocs, ...metricDocs]);
  try {
    await PlatformCirMills.syncIndexes();
  } catch {
    // ignore
  }
  const list = await PlatformCirMills.find({}).sort({ unit: 1, sortOrder: 1, size: 1 }).lean();
  return list.map(serializeCirMillsDoc);
}
