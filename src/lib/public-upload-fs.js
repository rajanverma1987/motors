import path from "path";
import { mkdirSync, writeFileSync } from "fs";

/**
 * Sanitize a path segment for public/uploads/<category>/<id>/ files.
 * @param {string} value
 */
export function sanitizeUploadSegment(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
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
  if (!safeId) {
    throw new Error("Invalid upload id");
  }
  const rel = `public/uploads/${category}/${safeId}`;
  return path.join(process.cwd(), rel);
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
  const filePath = path.join(absDir, fileName);
  writeFileSync(filePath, buffer);
  return filePath;
}
