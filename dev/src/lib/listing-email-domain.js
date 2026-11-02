/**
 * Consumer / free-mail domains — do not treat same-domain emails as the same shop.
 * Company domains (e.g. acmemotors.com) are used to find existing listings.
 */
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.in",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "email.com",
  "zoho.com",
  "zohomail.com",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "rediffmail.com",
  "inbox.com",
  "fastmail.com",
  "fastmail.fm",
  "tutanota.com",
  "tuta.io",
  "hey.com",
  "mail.ru",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "bellsouth.net",
  "cox.net",
  "charter.net",
  "earthlink.net",
  "optonline.net",
]);

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @returns {string} lowercase domain or empty */
export function extractEmailDomain(email) {
  const norm = String(email || "")
    .trim()
    .toLowerCase();
  const at = norm.lastIndexOf("@");
  if (at < 0 || at === norm.length - 1) return "";
  return norm.slice(at + 1);
}

export function isGenericEmailDomain(domain) {
  const d = String(domain || "")
    .trim()
    .toLowerCase();
  if (!d || !d.includes(".")) return true;
  return GENERIC_EMAIL_DOMAINS.has(d);
}

/** True when listings with the same @domain should be treated as possible duplicates. */
export function shouldMatchListingsByEmailDomain(email) {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return !isGenericEmailDomain(domain);
}

/**
 * Mongo filter for emails ending with @domain (case-insensitive).
 * @param {string} domain
 */
export function emailDomainMatchFilter(domain) {
  const d = String(domain || "")
    .trim()
    .toLowerCase();
  if (!d) return null;
  return { email: { $regex: `@${escapeRegex(d)}$`, $options: "i" } };
}
