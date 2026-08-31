/** Shared layout tokens for directory / location / near-me listing pages. */

export const LISTINGS_PAGE_CONTAINER = "mx-auto max-w-[100rem] px-4 sm:px-6";

/** Two columns on sm+ so cards stay wide beside the sticky form sidebar. */
export const LISTINGS_GRID = "grid gap-6 sm:grid-cols-2 lg:grid-cols-2";

export const LISTINGS_WITH_FORM_LAYOUT =
  "grid gap-8 lg:grid-cols-[minmax(0,1fr)_352px]";

/** Sticky repair form — self-start inside a stretched grid column. */
export const LISTINGS_FORM_STICKY = "sticky top-6 z-10 self-start lg:top-28";

/** Max height for sticky sidebar repair forms (fits below marketing nav + preferred-source stripe). */
export const REPAIR_FORM_SIDEBAR_MAX_H =
  "max-h-[calc(100dvh-6.5rem)] md:max-h-[calc(100dvh-8rem)]";

/** Centered prose column for industry vertical SEO pages (~700px). */
export const INDUSTRY_PAGE_CONTAINER = "mx-auto max-w-[44rem] px-4 sm:px-6 py-8 sm:py-10";

/** Industry pages: wide outer shell + content left, form right (wider sidebar than directory). */
export const INDUSTRY_PAGE_OUTER = LISTINGS_PAGE_CONTAINER;

export const INDUSTRY_WITH_FORM_LAYOUT =
  "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(374px,440px)] lg:items-start";
