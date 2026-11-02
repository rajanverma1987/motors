import JobSeekerProfile from "@/models/JobSeekerProfile";

export function slugifyTalentName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function generateUniqueTalentSlug(fullName, email) {
  const fromName = slugifyTalentName(fullName);
  const fromEmail = slugifyTalentName(String(email || "").split("@")[0]);
  const base = fromName || fromEmail || "seeker";
  let candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  let tries = 0;
  while (tries < 10) {
    const exists = await JobSeekerProfile.findOne({ slug: candidate }).select("_id").lean();
    if (!exists) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 10)}`;
    tries += 1;
  }
  return `${base}-${Date.now().toString(36)}`;
}
