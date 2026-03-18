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

/**
 * @param {string} url
 * @param {string} email
 */
export function isValidShopSettingsLogoUrl(url, email) {
  const prefix = shopSettingsLogoPathForEmail(email);
  const s = typeof url === "string" ? url.trim() : "";
  if (!s.startsWith(prefix)) return false;
  return /^\/uploads\/shop-settings\/[a-f0-9]{24}\/logo\.(png|jpe?g|gif|webp)$/i.test(s);
}

/**
 * Save shop logo for dashboard user. Overwrites previous logo in that folder.
 * @param {string} ownerEmail
 * @param {File} file
 * @returns {Promise<string>} path e.g. /uploads/shop-settings/abc/logo.png
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
      if (/^logo\./i.test(f)) unlinkSync(path.join(dir, f));
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
  const filename = `logo${safeExt}`;
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
      if (/^logo\./i.test(f)) unlinkSync(path.join(dir, f));
    }
  } catch {
    // ignore
  }
}
