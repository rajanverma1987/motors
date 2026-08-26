import path from "path";
import { mkdirSync, writeFileSync } from "fs";

/** @returns {string} Absolute path to runtime upload root (never traced by Turbopack). */
function getPublicUploadsRoot() {
  const fromEnv = String(process.env.UPLOADS_DIR || "").trim();
  if (fromEnv) {
    return path.resolve(/* turbopackIgnore: true */ fromEnv);
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "pub" + "lic",
    "up" + "loads"
  );
}

/**
 * Sanitize a path segment for public/uploads/<category>/<id>/ files.
 * @param {string} value
 */
export function sanitizeUploadSegment(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Resolve a safe absolute path under public/uploads from URL path segments.
 * @param {string[]} parts e.g. ["listings", "abc", "photo.jpg"]
 * @returns {string | null}
 */
export function resolvePublicUploadFilePath(parts) {
  const cleaned = (Array.isArray(parts) ? parts : [])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  if (!cleaned.length) return null;
  if (cleaned.some((p) => p.includes("..") || p.includes("\\"))) return null;
  const root = getPublicUploadsRoot();
  const resolved = path.resolve(/* turbopackIgnore: true */ root, ...cleaned);
  if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
    return null;
  }
  return resolved;
}

/**
 * Absolute directory for one entity under public/uploads/<category>/<entityId>.
 * Category must be a fixed literal at the call site (e.g. "listings", "quotes").
 *
 * @param {string} category
 * @param {string} entityId
 */
export function resolvePublicUploadEntityDir(category, entityId) {
  const safeId = sanitizeUploadSegment(entityId);
  const safeCategory = sanitizeUploadSegment(category);
  if (!safeCategory || !safeId) {
    throw new Error("Invalid upload id");
  }
  return path.join(/* turbopackIgnore: true */ getPublicUploadsRoot(), safeCategory, safeId);
}

/**
 * Public URL path served from public/uploads.
 * @param {string} category
 * @param {string} entityId
 * @param {string} fileName
 */
export function publicUploadUrlPath(category, entityId, fileName) {
  const safeId = sanitizeUploadSegment(entityId);
  const safeName = String(fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `/uploads/${category}/${safeId}/${safeName}`;
}

/**
 * @param {string} absDir
 * @param {string} fileName
 * @param {Buffer} buffer
 */
export function writeFileInUploadDir(absDir, fileName, buffer) {
  mkdirSync(absDir, { recursive: true });
  const filePath = path.join(/* turbopackIgnore: true */ absDir, fileName);
  writeFileSync(filePath, buffer);
  return filePath;
}
