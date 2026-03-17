import { getActiveLocationPagesForSitemap } from "@/lib/location-pages-public";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motors.example.com";

/** @type {import('next').MetadataRoute.Sitemap} */
export default async function sitemap() {
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/motor-repair-software`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/electric-motor-repair`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/motor-repair-near-me`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/motor-repair-shops`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/emergency-motor-repair`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/cost-of-motor-repair-and-rewinding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/electric-motor-reapir-shops-listings`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/electric-motor-reapir-near-me`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

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

  return [...staticPages, ...locationPages];
}
