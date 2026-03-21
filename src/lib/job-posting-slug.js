import JobPosting from "@/models/JobPosting";

/**
 * Normalize title to URL-safe slug fragment.
 */
export function slugifyTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

/**
 * Generate a unique slug for a job posting.
 */
export async function generateUniqueJobSlug(title) {
  const base = slugifyTitle(title) || "position";
  const suffix = Math.random().toString(36).slice(2, 10);
  let candidate = `${base}-${suffix}`;
  let tries = 0;
  while (tries < 8) {
    const exists = await JobPosting.findOne({ slug: candidate }).select("_id").lean();
    if (!exists) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 12)}`;
    tries += 1;
  }
  return `${base}-${Date.now().toString(36)}`;
}
