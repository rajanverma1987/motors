import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = "public/uploads/logos";
const MAX_SIZE_MB = 2;
/** Max dimension for stored logos — keeps directory listings fast; Next/Image also optimizes on the fly. */
const LOGO_MAX_EDGE_PX = 1200;
export const LOGO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Resize and encode as WebP for smaller files and faster loads (keeps transparency where applicable).
 * Falls back to original buffer on failure.
 */
async function optimizeLogoBuffer(buffer) {
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize(LOGO_MAX_EDGE_PX, LOGO_MAX_EDGE_PX, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    if (out && out.length > 0) return out;
  } catch (e) {
    console.warn("Logo optimization (sharp) failed, saving original:", e?.message || e);
  }
  return null;
}

/**
 * Save an uploaded logo file to public/uploads/logos. Returns path e.g. /uploads/logos/xxx.webp
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

  const optimized = await optimizeLogoBuffer(buffer);
  const useBuffer = optimized || buffer;
  const useExt = optimized ? ".webp" : path.extname(file.name || "") ||
    (type.includes("png") ? ".png" : type.includes("gif") ? ".gif" : type.includes("webp") ? ".webp" : ".jpg");

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${useExt}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, useBuffer);
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
