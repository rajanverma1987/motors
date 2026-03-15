import { connectDB } from "@/lib/db";
import LocationPage from "@/models/LocationPage";

export async function getLocationPageBySlug(slug, options = {}) {
  const { activeOnly = true } = options;
  if (!slug || typeof slug !== "string") return null;
  await connectDB();
  const query = { slug: slug.trim().toLowerCase() };
  if (activeOnly) query.status = "active";
  const doc = await LocationPage.findOne(query).lean();
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
  };
}

export async function getActiveLocationPagesForSitemap() {
  await connectDB();
  const list = await LocationPage.find({ status: "active" })
    .select("slug updatedAt")
    .lean();
  return list.map((l) => ({
    slug: l.slug,
    updatedAt: l.updatedAt,
  }));
}

/**
 * Build a URL-safe slug from city and state (e.g. "Atlanta", "Georgia" -> "atlanta-georgia").
 */
function slugFromCityState(city, state) {
  const parts = [city, state]
    .filter(Boolean)
    .map((s) =>
      String(s)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    )
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join("-");
}

/**
 * Ensure a location page exists for this area. If none exists, create one (so "Find more shops in same area" can link to it).
 * Call when a listing is approved so location pages grow automatically.
 * Returns the location page (existing or newly created), or null if city+state are missing.
 */
export async function ensureLocationPageForArea(city, state, zip) {
  const c = (city || "").trim();
  const s = (state || "").trim();
  const slug = slugFromCityState(c, s);
  if (!slug) return null;

  await connectDB();
  const existing = await LocationPage.findOne({ slug }).lean();
  if (existing) return { ...existing, id: existing._id.toString(), _id: undefined };

  const title = c && s ? `Motor Repair Shops in ${c}, ${s}` : s ? `Motor Repair Shops in ${s}` : `Motor Repair Shops in ${c}`;
  const doc = await LocationPage.create({
    slug,
    title,
    metaDescription: "",
    city: c,
    state: s,
    zip: (zip || "").trim(),
    status: "active",
  });
  return { ...doc.toObject(), id: doc._id.toString(), _id: undefined };
}

/**
 * Find an active location page that matches the given city and state (for "same area" link on listing page).
 * Prefers exact city+state match; otherwise first page that matches state.
 */
export async function getLocationPageForArea(city, state) {
  if (!city && !state) return null;
  await connectDB();
  const c = (city || "").trim().toLowerCase();
  const s = (state || "").trim().toLowerCase();
  const pages = await LocationPage.find({ status: "active" }).lean();
  const exact = pages.find(
    (p) =>
      (p.city || "").trim().toLowerCase() === c &&
      (p.state || "").trim().toLowerCase() === s
  );
  if (exact) {
    return { ...exact, id: exact._id.toString(), _id: undefined };
  }
  const stateOnly = pages.find((p) => (p.state || "").trim().toLowerCase() === s);
  if (stateOnly) {
    return { ...stateOnly, id: stateOnly._id.toString(), _id: undefined };
  }
  return null;
}
