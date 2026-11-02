/**
 * Public demo booking URL ([Cal.com](https://cal.com/iqmotorbase/30min)).
 * Override with NEXT_PUBLIC_DEMO_BOOKING_URL in .env.local if needed.
 */

export const DEMO_BOOKING_DEFAULT_URL = "https://cal.com/iqmotorbase/30min";

/**
 * @returns {string}
 */
export function getDemoBookingUrl() {
  const raw = String(process.env.NEXT_PUBLIC_DEMO_BOOKING_URL || "").trim();
  if (raw && (raw.startsWith("/") || /^https?:\/\//i.test(raw))) return raw;
  return DEMO_BOOKING_DEFAULT_URL;
}

/**
 * @param {string} [url]
 * @returns {boolean}
 */
export function isExternalDemoBookingUrl(url = getDemoBookingUrl()) {
  return /^https?:\/\//i.test(String(url || ""));
}
