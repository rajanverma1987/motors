import { getSitemapEntries } from "@/lib/sitemap-url-entries";

/** @type {import('next').MetadataRoute.Sitemap} */
export default async function sitemap() {
  return getSitemapEntries();
}
