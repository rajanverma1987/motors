import { getActiveLocationPagesForSitemap } from "@/lib/location-pages-public";
import { getAllPublishedSlugs } from "@/lib/marketplace";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { SEO_USA_HUB_PATH, SEO_USA_STATES, getAllSeoCityEntries } from "@/lib/seo-usa-config";
import { getPublicJobPostingSlugs } from "@/lib/job-postings-public";

/**
 * Shared sitemap URL list (same sources as `src/app/sitemap.js`).
 * Used by IndexNow post-build and the sitemap route.
 *
 * @returns {Promise<import('next').MetadataRoute.Sitemap>}
 */
export async function getSitemapEntries() {
  const baseUrl = getPublicSiteUrl();

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    {
      url: `${baseUrl}/motor-repair-marketplace`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    { url: `${baseUrl}/motor-repair-software`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/electric-motor-repair`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/motor-repair-near-me`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/motor-repair-shops`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/emergency-motor-repair`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/cost-of-motor-repair-and-rewinding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/electric-motor-reapir-shops-listings`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/electric-motor-reapir-near-me`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}${SEO_USA_HUB_PATH}`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.92 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.82 },
    { url: `${baseUrl}/motor-repair-shop-management-software`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.84 },
    { url: `${baseUrl}/job-card-system-for-repair-shop`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.84 },
    { url: `${baseUrl}/track-motor-repair-jobs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.84 },
    { url: `${baseUrl}/blog/how-to-get-more-customers-for-motor-repair-shop`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog/motor-rewinding-business-marketing-usa`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog/best-software-for-repair-shop-2026`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-manage-repair-jobs-efficiently`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/careers`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
  ];

  const seoUsaStatePages = SEO_USA_STATES.map((s) => ({
    url: `${baseUrl}/usa/${s.slug}/motor-repair-business-listing`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.88,
  }));

  const seoUsaCityPages = getAllSeoCityEntries().map((row) => ({
    url: `${baseUrl}${row.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  let locationPages = [];
  try {
    const active = await getActiveLocationPagesForSitemap();
    locationPages = active.map((p) => ({
      url: `${baseUrl}/motor-repair-shop/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("Sitemap location pages error:", err);
  }

  let marketplaceItems = [];
  try {
    const slugs = await getAllPublishedSlugs();
    marketplaceItems = slugs.map((slug) => ({
      url: `${baseUrl}/marketplace/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("Sitemap marketplace items error:", err);
  }

  let careerJobs = [];
  try {
    const jobSlugs = await getPublicJobPostingSlugs();
    careerJobs = jobSlugs.map((slug) => ({
      url: `${baseUrl}/careers/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.72,
    }));
  } catch (err) {
    console.error("Sitemap careers jobs error:", err);
  }

  return [...staticPages, ...seoUsaStatePages, ...seoUsaCityPages, ...locationPages, ...marketplaceItems, ...careerJobs];
}

/** Plain URL strings for IndexNow (deduped). */
export async function getAllSitemapUrls() {
  const entries = await getSitemapEntries();
  const urls = entries.map((e) => e.url).filter(Boolean);
  return [...new Set(urls)];
}
