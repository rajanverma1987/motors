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
          "/watch-demo",
          "/watch-demo/",
          "/api/demo-video",
          "/api/demo-video/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/dashboards",
          "/dashboards/",
          "/admin",
          "/admin/",
          "/watch-demo",
          "/watch-demo/",
          "/api/demo-video",
          "/api/demo-video/",
        ],
      },
      {
        userAgent: "bingbot",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/dashboards",
          "/dashboards/",
          "/admin",
          "/admin/",
          "/watch-demo",
          "/watch-demo/",
          "/api/demo-video",
          "/api/demo-video/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
