import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = "public/uploads/marketplace";
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/**
 * Write a marketplace listing image and return a site-relative URL path.
 * @param {Buffer} buffer
 * @param {string} [originalName]
 * @returns {string} e.g. /uploads/marketplace/1739-abc.jpg
 */
export function saveMarketplaceListingImage(buffer, originalName = "photo.jpg") {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid file");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Image must be under ${MAX_BYTES / 1024 / 1024}MB`);
  }
  const ext = path.extname(String(originalName || "").trim() || ".jpg").toLowerCase() || ".jpg";
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Use JPG, PNG, WebP, or GIF");
  }
  const id = randomBytes(8).toString("hex");
  const safeName = `${Date.now()}-${id}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(process.cwd(), UPLOAD_DIR);
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, buffer);
  return `/uploads/marketplace/${safeName}`;
}
