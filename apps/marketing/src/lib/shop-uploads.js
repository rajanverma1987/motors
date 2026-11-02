import path from "path";
import fs from "fs/promises";

const ALLOWED_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Root for this shop's files. Prefer SHOP_UPLOADS_ROOT; else shop_uploads/{slug} under cwd/repo.
 */
export function getShopUploadsRoot() {
  const explicit = String(process.env.SHOP_UPLOADS_ROOT || "").trim();
  if (explicit) return path.resolve(explicit);
  const slug = String(process.env.TENANT_SLUG || "cemotor").trim().toLowerCase() || "cemotor";
  const parent = String(process.env.SHOP_UPLOADS_PARENT || "").trim();
  if (parent) return path.resolve(parent, slug);
  return path.resolve(process.cwd(), "shop_uploads", slug);
}

export function shopUploadLimits() {
  return { maxBytes: MAX_BYTES, allowedExt: [...ALLOWED_EXT] };
}

export function assertAllowedShopUpload(fileName, byteLength) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: "Only PDF and image uploads are allowed (pdf, png, jpg, jpeg, gif, webp)." };
  }
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    return { ok: false, error: "Empty upload." };
  }
  if (byteLength > MAX_BYTES) {
    return { ok: false, error: "File too large. Max size is 2 MB." };
  }
  return { ok: true, ext };
}

export async function ensureShopUploadsRoot() {
  const root = getShopUploadsRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

export function resolveShopUploadPath(...parts) {
  const root = getShopUploadsRoot();
  const resolved = path.resolve(root, ...parts);
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid upload path");
  }
  return resolved;
}
