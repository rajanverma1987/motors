import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const UPLOAD_DIR = "public/uploads/logos";
const MAX_SIZE_MB = 2;
export const LOGO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Save an uploaded logo file to public/uploads/logos. Returns path e.g. /uploads/logos/xxx.png
 * @param {File} file - Web API File from FormData
 * @returns {Promise<string>}
 */
export async function saveUploadedLogoFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("No file provided");
  }
  const type = file.type?.toLowerCase() || "";
  if (!LOGO_ALLOWED_TYPES.includes(type)) {
    throw new Error("Invalid file type. Use JPEG, PNG, GIF, or WebP.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File must be under ${MAX_SIZE_MB}MB`);
  }
  const dir = path.join(process.cwd(), UPLOAD_DIR);
  mkdirSync(dir, { recursive: true });
  const ext =
    path.extname(file.name || "") ||
    (type.includes("png") ? ".png" : type.includes("gif") ? ".gif" : type.includes("webp") ? ".webp" : ".jpg");
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, buffer);
  return `/uploads/logos/${safeName}`;
}

/** Only allow our hosted logo paths on listing create (no hotlinked URLs). */
export function sanitizeListingLogoUrlForCreate(url, maxLen = 500) {
  const s = typeof url === "string" ? url.trim() : "";
  if (!s) return "";
  if (/^\/uploads\/logos\/[a-zA-Z0-9._-]+$/.test(s)) {
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }
  return "";
}
