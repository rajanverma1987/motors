import { cache } from "react";
import { resolvePublicListingFromSlugParam } from "@/lib/listings-public";

/**
 * Request-memoized slug resolution so layout.js, generateMetadata, and page.js
 * share a single lookup.
 */
export const resolveListing = cache(async (slug) => resolvePublicListingFromSlugParam(slug));
