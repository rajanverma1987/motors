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
          "/dashboard/",
          "/dashboards",
          "/dashboards/",
          "/admin",
          "/admin/",
          "/portal/",
          "/invoice/",
          "/quote/",
          "/po/",
          "/job-board",
          "/Track",
          "/iqwire",
          "/time-clock/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/dashboard/", "/dashboards", "/dashboards/", "/admin", "/admin/"],
      },
      {
        userAgent: "bingbot",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/dashboard/", "/dashboards", "/dashboards/", "/admin", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
