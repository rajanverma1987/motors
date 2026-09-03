import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

const NOTIFY_EMAILS_MAX = 10;
const NOTIFY_RAW_MAX = 800;

/**
 * Parse comma- or semicolon-separated notification emails (excludes blanks / invalid).
 * @param {unknown} raw
 * @returns {{ emails: string[], error: string | null }}
 */
export function parseNotificationEmailsList(raw) {
  if (Array.isArray(raw)) {
    const valid = [];
    for (const item of raw) {
      const e = clampString(String(item || ""), LIMITS.email.max).trim().toLowerCase();
      if (!e) continue;
      if (!isValidEmail(e)) {
        return { emails: [], error: `Invalid notification email: ${e}` };
      }
      valid.push(e);
    }
    const deduped = [...new Set(valid)];
    if (deduped.length > NOTIFY_EMAILS_MAX) {
      return { emails: [], error: `Notification emails are limited to ${NOTIFY_EMAILS_MAX} addresses.` };
    }
    return { emails: deduped, error: null };
  }

  const str = String(raw ?? "").trim();
  if (!str) return { emails: [], error: null };
  if (str.length > NOTIFY_RAW_MAX) {
    return { emails: [], error: `Notification emails must be ${NOTIFY_RAW_MAX} characters or fewer.` };
  }
  const parts = str.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  return parseNotificationEmailsList(parts);
}

/**
 * All addresses that should receive shop listing/lead notifications.
 * Always includes primary `email` (login), then extras from `notificationEmails`.
 * @param {{ email?: string, notificationEmails?: string[] } | null | undefined} listing
 * @returns {string[]}
 */
export function getListingNotifyEmails(listing) {
  const primary = clampString(String(listing?.email || ""), LIMITS.email.max)
    .trim()
    .toLowerCase();
  const extras = Array.isArray(listing?.notificationEmails) ? listing.notificationEmails : [];
  const out = [];
  const seen = new Set();
  for (const raw of [primary, ...extras]) {
    const e = clampString(String(raw || ""), LIMITS.email.max).trim().toLowerCase();
    if (!e || !isValidEmail(e) || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

/**
 * Send the same notification to every listing notify address.
 * @param {object} listing
 * @param {(to: string) => Promise<unknown>} sendOne
 */
export async function sendToListingNotifyEmails(listing, sendOne) {
  const emails = getListingNotifyEmails(listing);
  for (const to of emails) {
    try {
      await sendOne(to);
    } catch (err) {
      console.warn(`Listing notify email failed for ${to}:`, err?.message || err);
    }
  }
  return emails;
}
