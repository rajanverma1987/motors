/**
 * Client-safe talent profile serialization (no mongoose / next/headers).
 */

export function serializeTalentProfile(doc, { includePrivate = false } = {}) {
  if (!doc) return null;
  const id = String(doc._id || doc.id || "");
  const base = {
    id,
    slug: doc.slug || "",
    fullName: doc.fullName || "",
    headline: doc.headline || "",
    bio: doc.bio || "",
    city: doc.city || "",
    state: doc.state || "",
    preferredAreas: Array.isArray(doc.preferredAreas) ? doc.preferredAreas : [],
    willingToRelocate: Boolean(doc.willingToRelocate),
    availability: doc.availability || "open",
    yearsExperience: Number(doc.yearsExperience || 0),
    experienceLevel: doc.experienceLevel || "entry",
    skills: Array.isArray(doc.skills) ? doc.skills : [],
    roles: Array.isArray(doc.roles) ? doc.roles : [],
    employmentTypes: Array.isArray(doc.employmentTypes) ? doc.employmentTypes : [],
    salaryExpectation: doc.salaryExpectation || "",
    workAuthorization: doc.workAuthorization || "",
    linkedinUrl: doc.linkedinUrl || "",
    portfolioUrl: doc.portfolioUrl || "",
    resumeUrl: doc.resumeUrl || "",
    profileScore: Number(doc.profileScore || 0),
    status: doc.status || "active",
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
  if (includePrivate) {
    return {
      ...base,
      email: doc.email || "",
      phone: doc.phone || "",
      emailVerifiedAt: doc.emailVerifiedAt || null,
      jobAlertsEnabled: doc.jobAlertsEnabled !== false,
      photoUrl: doc.photoUrl || "",
    };
  }
  return base;
}
