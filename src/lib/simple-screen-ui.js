/** Shared class names for Simple `/dashboards` screen chrome (not forms). */

export const SIMPLE_PORTAL_ROOT_CLASS = "simple-portal";

export const SIMPLE_SCREEN_FILTERS_CLASS = "simple-screen-filters";

export const SIMPLE_SCREEN_TABLE_WRAP_CLASS = "simple-screen-table-wrap";

export const SIMPLE_SCREEN_PANEL_CLASS =
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden";

/** Freeze first N hub list columns on tablet / smaller (12" and below). */
export const SIMPLE_HUB_STICKY_COLUMN_COUNT = 3;

/** Match ~12" tablet landscape and smaller; large desktops scroll without freeze. */
export const SIMPLE_HUB_STICKY_COLUMNS_MQ = "(max-width: 1400px)";