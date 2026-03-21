/**
 * SEO helpers for public career / job posting pages (metadata + schema.org JobPosting).
 */

/** @typedef {{ slug: string; title: string; description?: string; location?: string; shopName?: string; employmentType?: string; updatedAt?: Date | string; responsibilities?: string; qualifications?: string; benefits?: string }} CareerJobForSeo */

/** Google Search supported employmentType values for JobPosting */
const SCHEMA_EMPLOYMENT = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
};

export function jobPostingSchemaEmploymentType(employmentType) {
  const key = String(employmentType || "full_time");
  return SCHEMA_EMPLOYMENT[key] || "FULL_TIME";
}

const META_MAX = 160;

/**
 * Plain-text body for JSON-LD description (no HTML).
 * @param {CareerJobForSeo} job
 */
export function buildJobPostingPlainDescription(job) {
  const parts = [
    job.description,
    job.responsibilities ? `Responsibilities:\n${job.responsibilities}` : "",
    job.qualifications ? `Qualifications:\n${job.qualifications}` : "",
    job.benefits ? `Benefits:\n${job.benefits}` : "",
  ].filter(Boolean);
  const text = parts.join("\n\n").replace(/\s+/g, " ").trim();
  return text || `${job.title} at ${job.shopName}.`;
}

/**
 * Meta description (≤160 chars) for <meta name="description"> and OG/Twitter.
 * @param {CareerJobForSeo} job
 */
export function buildCareerMetaDescription(job) {
  const shop = job.shopName || "Motor repair shop";
  const loc = job.location ? ` ${job.location}.` : "";
  const base = `${job.title} — ${shop}.${loc}`;
  const fromDesc = (job.description || "").replace(/\s+/g, " ").trim();
  let out = fromDesc ? `${base} ${fromDesc}` : base;
  if (out.length <= META_MAX) return out;
  const clip = out.slice(0, META_MAX - 1).trim();
  const lastSpace = clip.lastIndexOf(" ");
  const safe = lastSpace > 80 ? clip.slice(0, lastSpace) : clip;
  return `${safe}…`;
}

/**
 * Full JobPosting JSON-LD for Google rich results (plain-text description).
 * @param {CareerJobForSeo} job
 * @param {string} canonicalUrl Absolute URL of the job page
 */
export function buildJobPostingJsonLd(job, canonicalUrl) {
  const description = buildJobPostingPlainDescription(job);
  const datePosted = job.updatedAt ? new Date(job.updatedAt).toISOString() : undefined;

  const org = {
    "@type": "Organization",
    name: job.shopName || "Motor repair shop",
  };

  /** @type {Record<string, unknown>} */
  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    employmentType: jobPostingSchemaEmploymentType(job.employmentType),
    hiringOrganization: org,
    identifier: {
      "@type": "PropertyValue",
      name: "MotorsWinding job slug",
      value: job.slug,
    },
    directApply: true,
    url: canonicalUrl,
    industry: "Industrial Equipment Repair",
    occupationalCategory: "Motor repair and rewinding",
  };

  if (datePosted) data.datePosted = datePosted;

  if (job.location) {
    data.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "US",
      },
    };
  }

  return data;
}
