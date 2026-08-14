import { getPublicSiteUrl } from "@/lib/public-site-url";

const baseUrl = getPublicSiteUrl();

/** @type {import('next').MetadataRoute.Robots} */
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboards",
          "/admin",
          "/portal/",
          "/invoice/",
          "/quote/",
          "/po/",
          "/job-board",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
