/**
 * Shared SEO assets for the Simple portal tablet hero visual.
 * Used on home + software pillar pages for alt text, Open Graph, and JSON-LD.
 */

export const HERO_DASHBOARD_TABLET_PATH = "/images/hero-dashboard-tablet.jpg";

/** Descriptive alt for accessibility + image SEO (natural keywords, not stuffed). */
export const HERO_DASHBOARD_TABLET_ALT =
  "IQMotorBase motor repair shop management software on a tablet showing service proposals, status summary cards, and a searchable job list";

export const HERO_DASHBOARD_TABLET_WIDTH = 1024;
export const HERO_DASHBOARD_TABLET_HEIGHT = 768;

/**
 * Next.js metadata openGraph/twitter image entry for the tablet hero.
 * @param {{ alt?: string }} [opts]
 */
export function heroDashboardTabletOgImage(opts = {}) {
  return {
    url: HERO_DASHBOARD_TABLET_PATH,
    width: HERO_DASHBOARD_TABLET_WIDTH,
    height: HERO_DASHBOARD_TABLET_HEIGHT,
    alt: opts.alt || HERO_DASHBOARD_TABLET_ALT,
    type: "image/jpeg",
  };
}

/** Features-section visual: winders drawing a 4-pole motor diagram on tablet. */
export const FEATURES_WINDERS_TABLET_PATH = "/images/hero-winders-drawing-tablet.png";

export const FEATURES_WINDERS_TABLET_ALT =
  "Motor winders drawing a 4-pole motor winding diagram on IQMotorBase shop management software on a tablet in the repair shop";

export const FEATURES_WINDERS_TABLET_WIDTH = 1536;
export const FEATURES_WINDERS_TABLET_HEIGHT = 1024;
