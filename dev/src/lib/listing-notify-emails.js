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

function normalizeEmail(raw) {
  const e = clampString(String(raw || ""), LIMITS.email.max).trim().toLowerCase();
  if (!e || !isValidEmail(e)) return "";
  return e;
}

function extraNotifyEmails(raw) {
  const items = Array.isArray(raw)
    ? raw
    : String(raw || "")
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const e = normalizeEmail(item);
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

function pushUnique(out, seen, raw) {
  const e = normalizeEmail(raw);
  if (!e || seen.has(e)) return;
  seen.add(e);
  out.push(e);
}

/**
 * All addresses that should receive shop listing/lead notifications.
 * Always includes listing login `email`, then extras from `notificationEmails`.
 * @param {{ email?: string, loginEmail?: string, notificationEmails?: string[] | string } | null | undefined} listing
 * @returns {string[]}
 */
export function getListingNotifyEmails(listing) {
  const out = [];
  const seen = new Set();
  pushUnique(out, seen, listing?.email);
  pushUnique(out, seen, listing?.loginEmail);
  for (const extra of extraNotifyEmails(listing?.notificationEmails)) {
    pushUnique(out, seen, extra);
  }
  return out;
}

/**
 * Login email on the listing, plus CRM user login if onboarded under a different address,
 * plus extra notification emails.
 * @param {{ email?: string, loginEmail?: string, notificationEmails?: unknown, crmUserId?: unknown } | null | undefined} listing
 * @returns {Promise<string[]>}
 */
export async function getListingNotifyEmailsIncludingCrmLogin(listing) {
  const emails = getListingNotifyEmails(listing);
  const crmId = listing?.crmUserId;
  if (!crmId) return emails;
  try {
    const User = (await import("@/models/User")).default;
    const user = await User.findById(crmId).select("email").lean();
    const login = normalizeEmail(user?.email);
    if (!login) return emails;
    if (emails[0] === login) return emails;
    return [login, ...emails.filter((e) => e !== login)];
  } catch {
    return emails;
  }
}

/**
 * Send the same notification to every listing notify address (login + extras).
 * @param {object} listing
 * @param {(to: string) => Promise<{ ok?: boolean, error?: string } | unknown>} sendOne
 */
export async function sendToListingNotifyEmails(listing, sendOne) {
  const emails = await getListingNotifyEmailsIncludingCrmLogin(listing);
  const sent = [];
  const failed = [];
  if (emails.length === 0) {
    console.warn(
      `Listing notify skipped (no login or notification emails): ${listing?.companyName || listing?._id || ""}`
    );
    return { emails, sent, failed };
  }
  for (const to of emails) {
    try {
      const result = await sendOne(to);
      if (result && result.ok === false) {
        console.warn(`Listing notify email failed for ${to}:`, result.error || "unknown");
        failed.push({ to, error: result.error || "unknown" });
        continue;
      }
      sent.push(to);
    } catch (err) {
      console.warn(`Listing notify email failed for ${to}:`, err?.message || err);
      failed.push({ to, error: err?.message || String(err) });
    }
  }
  return { emails, sent, failed };
}
