import mongoose from "mongoose";

const INTERNAL_KEYS = new Set([
  "_id",
  "__v",
  "createdByEmail",
  "id",
  "createdAt",
  "updatedAt",
]);

/**
 * Strip client/internal keys before writing a Simple portal document.
 * @param {Record<string, unknown>} body
 */
export function sanitizeSimplePortalPayload(body) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (INTERNAL_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Normalize a lean/doc Simple portal record for JSON responses.
 * @param {Record<string, unknown>|null|undefined} doc
 */
export function serializeSimplePortalDoc(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const id = o._id != null ? String(o._id) : String(o.id || "");
  delete o._id;
  delete o.__v;
  delete o.createdByEmail;
  return { ...o, id };
}

/**
 * @param {string} raw
 */
export function isValidSimplePortalId(raw) {
  const id = String(raw || "").trim();
  return Boolean(id && mongoose.isValidObjectId(id));
}
