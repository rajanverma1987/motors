import { getPublicSiteUrl } from "@/lib/public-site-url";

const baseUrl = getPublicSiteUrl();

/** Shop hosts are private portals; do not index. */
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    host: baseUrl,
  };
}
