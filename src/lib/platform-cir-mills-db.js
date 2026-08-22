import { connectDB } from "@/lib/db";
import PlatformCirMills from "@/models/PlatformCirMills";
import { DEFAULT_CIR_MILLS_ROWS } from "@/lib/platform-cir-mills";

/**
 * Ensure platform Cir Mills table exists (seed from default CSV data once).
 * @returns {Promise<{ seeded: boolean, count: number }>}
 */
export async function ensurePlatformCirMillsSeeded() {
  await connectDB();
  const count = await PlatformCirMills.countDocuments({});
  if (count > 0) return { seeded: false, count };

  const docs = DEFAULT_CIR_MILLS_ROWS.map((row, index) => ({
    size: String(row.size).trim(),
    circularMills: Number(row.circularMills),
    sortOrder: index,
    isActive: true,
  }));
  await PlatformCirMills.insertMany(docs);
  return { seeded: true, count: docs.length };
}

export function serializeCirMillsDoc(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    size: String(doc.size || "").trim(),
    circularMills: Number(doc.circularMills) || 0,
    sortOrder: Number(doc.sortOrder) || 0,
    isActive: doc.isActive !== false,
    updatedAt: doc.updatedAt || null,
    createdAt: doc.createdAt || null,
  };
}

/** Active rows for calculators (all SaaS users). */
export async function listActivePlatformCirMills() {
  await ensurePlatformCirMillsSeeded();
  const list = await PlatformCirMills.find({ isActive: true })
    .sort({ sortOrder: 1, size: 1 })
    .lean();
  return list.map(serializeCirMillsDoc);
}
