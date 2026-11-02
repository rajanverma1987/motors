import { createHash } from "crypto";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { LOGO_ALLOWED_TYPES } from "@/lib/logo-upload";

const MAX_SIZE_MB = 2;
const UPLOAD_ROOT = "public/uploads/shop-settings";

export function shopSettingsLogoFolderHash(email) {
  const e = String(email || "").trim().toLowerCase();
  return createHash("sha256").update(e).digest("hex").slice(0, 24);
}

/** Relative URL path for this user’s shop logo (for validation). */
export function shopSettingsLogoPathForEmail(email) {
  const hash = shopSettingsLogoFolderHash(email);
  return `/uploads/shop-settings/${hash}/`;
}

/** Strip query/hash so validation and disk reads work with cache-busted URLs. */
export function normalizeShopSettingsLogoPath(url) {
  const s = typeof url === "string" ? url.trim() : "";
  if (!s) return "";
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return u.pathname || "";
    }
  } catch {
    // fall through
  }
  return s.split("?")[0].split("#")[0];
}

/**
 * @param {string} url
 * @param {string} email
 */
export function isValidShopSettingsLogoUrl(url, email) {
  const prefix = shopSettingsLogoPathForEmail(email);
  const s = normalizeShopSettingsLogoPath(url);
  if (!s.startsWith(prefix)) return false;
  // logo.png (legacy) or logo-<timestamp>.png (cache-safe replaces)
  return /^\/uploads\/shop-settings\/[a-f0-9]{24}\/logo(-[a-zA-Z0-9]+)?\.(png|jpe?g|gif|webp)$/i.test(
    s
  );
}

/**
 * Absolute filesystem path for a stored shop logo URL, or null if invalid.
 * @param {string} ownerEmail
 * @param {string} logoUrl
 */
export function shopSettingsLogoAbsolutePath(ownerEmail, logoUrl) {
  const s = normalizeShopSettingsLogoPath(logoUrl);
  if (!isValidShopSettingsLogoUrl(s, ownerEmail)) return null;
  return path.join(process.cwd(), "public", s.replace(/^\//, ""));
}

/**
 * Save shop logo for dashboard user. Overwrites previous logo in that folder.
 * Uses a unique filename so browsers/tablets do not keep a cached 404 or old image
 * (uploads were previously always `logo.png` with year-long immutable cache).
 * @param {string} ownerEmail
 * @param {File} file
 * @returns {Promise<string>} path e.g. /uploads/shop-settings/abc/logo-171000.png
 */
export async function saveShopSettingsLogo(ownerEmail, file) {
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
  const hash = shopSettingsLogoFolderHash(ownerEmail);
  const dir = path.join(process.cwd(), UPLOAD_ROOT, hash);
  mkdirSync(dir, { recursive: true });
  try {
    for (const f of readdirSync(dir)) {
      if (/^logo(-[a-zA-Z0-9]+)?\./i.test(f)) unlinkSync(path.join(dir, f));
    }
  } catch {
    // ignore
  }
  const ext =
    path.extname(file.name || "").toLowerCase() ||
    (type.includes("png")
      ? ".png"
      : type.includes("gif")
        ? ".gif"
        : type.includes("webp")
          ? ".webp"
          : ".jpg");
  const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
  const filename = `logo-${Date.now()}${safeExt}`;
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, buffer);
  return `/uploads/shop-settings/${hash}/${filename}`;
}

/**
 * Remove logo files for user (best effort).
 * @param {string} ownerEmail
 */
export function removeShopSettingsLogoFiles(ownerEmail) {
  const hash = shopSettingsLogoFolderHash(ownerEmail);
  const dir = path.join(process.cwd(), UPLOAD_ROOT, hash);
  try {
    for (const f of readdirSync(dir)) {
      if (/^logo(-[a-zA-Z0-9]+)?\./i.test(f)) unlinkSync(path.join(dir, f));
    }
  } catch {
    // ignore
  }
}
