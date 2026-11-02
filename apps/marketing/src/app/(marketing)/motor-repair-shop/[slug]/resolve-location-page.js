import { cache } from "react";
import { getLocationPageBySlug } from "@/lib/location-pages-public";

/**
 * Request-memoized slug lookup so layout.js, generateMetadata, and page.js
 * share a single database query.
 */
export const resolveLocationPage = cache(async (slug) => (slug ? getLocationPageBySlug(slug) : null));
