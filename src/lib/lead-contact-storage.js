/**
 * Persist buyer contact fields in localStorage so public lead forms autofill.
 * Motor / job details are intentionally excluded — only contact + location.
 */

export const LEAD_CONTACT_STORAGE_KEY = "iqmb_buyer_contact_v1";

export const LEAD_CONTACT_FIELDS = ["name", "company", "phone", "email", "city", "state", "zipCode"];

function pickTrimmed(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/**
 * Normalize arbitrary form/API shapes into the shared contact shape.
 * @param {Record<string, unknown>} [input]
 * @returns {Record<string, string>}
 */
export function normalizeLeadContact(input) {
  if (!input || typeof input !== "object") return {};
  const company = pickTrimmed(input.company, input.companyName, input.businessName, input.businessType);
  const out = {
    name: pickTrimmed(input.name),
    company,
    phone: pickTrimmed(input.phone),
    email: pickTrimmed(input.email),
    city: pickTrimmed(input.city),
    state: pickTrimmed(input.state),
    zipCode: pickTrimmed(input.zipCode, input.zip),
  };
  const cleaned = {};
  for (const key of LEAD_CONTACT_FIELDS) {
    if (out[key]) cleaned[key] = out[key];
  }
  return cleaned;
}

/**
 * @returns {Record<string, string>}
 */
export function loadLeadContact() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LEAD_CONTACT_STORAGE_KEY);
    if (!raw) return {};
    return normalizeLeadContact(JSON.parse(raw));
  } catch {
    return {};
  }
}

/**
 * Merge and save contact fields (non-empty only). Safe no-op outside the browser.
 * @param {Record<string, unknown>} partial
 */
export function saveLeadContact(partial) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadLeadContact(), ...normalizeLeadContact(partial) };
    if (Object.keys(next).length === 0) return;
    window.localStorage.setItem(LEAD_CONTACT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * Fill empty contact fields on a form object from localStorage.
 * @param {Record<string, unknown>} form
 * @param {{ skip?: string[], overwrite?: boolean }} [opts]
 * @returns {Record<string, unknown>}
 */
export function withLeadContactPrefill(form, opts = {}) {
  const saved = loadLeadContact();
  const skip = new Set(opts.skip || []);
  const overwrite = !!opts.overwrite;
  const out = { ...form };
  for (const key of LEAD_CONTACT_FIELDS) {
    if (skip.has(key) || !saved[key]) continue;
    if (overwrite || !String(out[key] ?? "").trim()) {
      out[key] = saved[key];
    }
  }
  return out;
}
