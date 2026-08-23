/** Shared layout tokens for directory / location / near-me listing pages. */

export const LISTINGS_PAGE_CONTAINER = "mx-auto max-w-[100rem] px-4 sm:px-6";

/** Two columns on sm+ so cards stay wide beside the sticky form sidebar. */
export const LISTINGS_GRID = "grid gap-6 sm:grid-cols-2 lg:grid-cols-2";

export const LISTINGS_WITH_FORM_LAYOUT =
  "grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]";

/** Sticky repair form — self-start inside a stretched grid column. */
export const LISTINGS_FORM_STICKY = "sticky top-6 z-10 self-start lg:top-8";
