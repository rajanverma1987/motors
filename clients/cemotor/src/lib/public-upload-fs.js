import path from "path";
import { mkdirSync, writeFileSync } from "fs";

const CLIENT_ALLOWED_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const CLIENT_MAX_BYTES = 2 * 1024 * 1024;

function isClientUploadMode() {
  return (
    String(process.env.APP_ROLE || "").toLowerCase() === "client" ||
    Boolean(String(process.env.SHOP_UPLOADS_ROOT || "").trim())
  );
}

/** @returns {string} Absolute path to runtime upload root (never traced by Turbopack). */
export function getPublicUploadsRoot() {
  const shopRoot = String(process.env.SHOP_UPLOADS_ROOT || "").trim();
  if (shopRoot) {
    return path.resolve(/* turbopackIgnore: true */ shopRoot);
  }
  const fromEnv = String(process.env.UPLOADS_DIR || "").trim();
  if (fromEnv) {
    return path.resolve(/* turbopackIgnore: true */ fromEnv);
  }
  if (isClientUploadMode()) {
    const slug = String(process.env.TENANT_SLUG || "cemotor").trim().toLowerCase() || "cemotor";
    const parent = String(process.env.SHOP_UPLOADS_PARENT || "").trim();
    if (parent) return path.resolve(/* turbopackIgnore: true */ parent, slug);
    return path.resolve(/* turbopackIgnore: true */ process.cwd(), "shop_uploads", slug);
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "pub" + "lic",
    "up" + "loads"
  );
}

/**
 * Sanitize a path segment for uploads/<category>/<id>/ files.
 * @param {string} value
 */
export function sanitizeUploadSegment(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Resolve a safe absolute path under upload root from URL path segments.
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
 * Absolute directory for one entity under uploads/<category>/<entityId>.
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
 * Public URL path served via /uploads/[...path].
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
  if (isClientUploadMode()) {
    const ext = path.extname(String(fileName || "")).toLowerCase();
    if (!CLIENT_ALLOWED_EXT.has(ext)) {
      throw new Error("Only PDF and image uploads are allowed (pdf, png, jpg, jpeg, gif, webp).");
    }
    if (!Buffer.isBuffer(buffer) || buffer.length <= 0 || buffer.length > CLIENT_MAX_BYTES) {
      throw new Error("File too large or empty. Max size is 2 MB.");
    }
  }
  mkdirSync(absDir, { recursive: true });
  const filePath = path.join(/* turbopackIgnore: true */ absDir, fileName);
  writeFileSync(filePath, buffer);
  return filePath;
}
