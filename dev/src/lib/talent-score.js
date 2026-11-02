/**
 * Profile completeness 0 to 100. Used to encourage seekers to fill details.
 * @param {object} profile
 */
export function computeTalentProfileScore(profile) {
  const p = profile || {};
  let score = 0;
  const add = ( Cond, points) => {
    if (cond) score += points;
  };

  add(String(p.fullName || "").trim().length >= 2, 10);
  add(String(p.phone || "").trim().length >= 7, 8);
  add(String(p.headline || "").trim().length >= 8, 8);
  add(String(p.bio || "").trim().length >= 40, 12);
  add(String(p.city || "").trim().length >= 2, 6);
  add(String(p.state || "").trim().length >= 2, 6);
  add(Array.isArray(p.preferredAreas) && p.preferredAreas.length > 0, 8);
  add(p.availability && p.availability !== "not_looking", 6);
  add(Number(p.yearsExperience) > 0 || p.yearsExperience === 0, 6);
  add(Boolean(p.experienceLevel), 4);
  add(Array.isArray(p.skills) && p.skills.length >= 2, 10);
  add(Array.isArray(p.roles) && p.roles.length >= 1, 6);
  add(Array.isArray(p.employmentTypes) && p.employmentTypes.length >= 1, 4);
  add(Boolean(String(p.resumeUrl || "").trim()), 6);

  return Math.min(100, score);
}
