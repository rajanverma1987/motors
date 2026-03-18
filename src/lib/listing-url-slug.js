import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { slugify } from "@/lib/listing-slug";

/**
 * Generate a unique urlSlug for a listing (approved public URL path segment).
 */
export async function generateUniqueListingUrlSlug(companyName, excludeListingId) {
  await connectDB();
  const base = slugify(companyName) || "repair-center";
  let candidate = base;
  for (let attempt = 0; attempt < 80; attempt++) {
    const query = { urlSlug: candidate };
    if (excludeListingId) {
      query._id = { $ne: excludeListingId };
    }
    const existing = await Listing.findOne(query).select("_id").lean();
    if (!existing) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

let backfillPromise = null;
let backfillCompleted = false;

/** Ensure every approved listing has a urlSlug (runs once per server process after first call). */
export async function ensureApprovedListingsHaveUrlSlug() {
  if (backfillCompleted) return;
  if (!backfillPromise) {
    backfillPromise = (async () => {
      await connectDB();
      const docs = await Listing.find({
        status: "approved",
        $or: [{ urlSlug: { $exists: false } }, { urlSlug: "" }, { urlSlug: null }],
      })
        .select("_id companyName")
        .lean();
      for (const doc of docs) {
        const slug = await generateUniqueListingUrlSlug(doc.companyName, doc._id);
        try {
          await Listing.updateOne({ _id: doc._id }, { $set: { urlSlug: slug } });
        } catch (e) {
          if (e?.code === 11000) {
            const slug2 = await generateUniqueListingUrlSlug(
              `${doc.companyName} ${doc._id.toString().slice(-6)}`,
              doc._id
            );
            await Listing.updateOne({ _id: doc._id }, { $set: { urlSlug: slug2 } });
          } else throw e;
        }
      }
      backfillCompleted = true;
    })();
  }
  await backfillPromise;
}
