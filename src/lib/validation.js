/**
 * Server-side input validation and length limits to prevent abuse and injection.
 */
export const LIMITS = {
  email: { max: 320 },
  password: { min: 6, max: 128 },
  name: { max: 200 },
  companyName: { max: 300 },
  message: { max: 2000 },
  shortText: { max: 300 },
  city: { max: 100 },
  state: { max: 100 },
  zip: { max: 20 },
  arrayMaxLength: 50,
  url: { max: 2048 },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const t = email.trim().toLowerCase();
  return t.length > 0 && t.length <= LIMITS.email.max && EMAIL_REGEX.test(t);
}

export function clampString(value, max) {
  if (value == null || typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function clampArray(arr, max = LIMITS.arrayMaxLength) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x != null && typeof x === "string").slice(0, max).map((s) => s.trim().slice(0, LIMITS.shortText.max));
}
