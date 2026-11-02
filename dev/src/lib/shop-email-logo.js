import { readFileSync } from "fs";
import path from "path";
import { normalizeShopSettingsLogoPath, shopSettingsLogoAbsolutePath } from "@/lib/shop-settings-logo";

export const SHOP_EMAIL_LOGO_CID = "shop-logo@motor-shop";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Read shop logo bytes from disk when stored under /uploads/shop-settings/.
 * @param {string} ownerEmail
 * @param {string} logoUrl
 */
export function readShopSettingsLogoFile(ownerEmail, logoUrl) {
  const filePath = shopSettingsLogoAbsolutePath(ownerEmail, logoUrl);
  if (!filePath) return null;
  try {
    const buffer = readFileSync(filePath);
    if (!buffer?.length) return null;
    const ext = path.extname(normalizeShopSettingsLogoPath(logoUrl)).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "image/png";
    return { buffer, contentType, filename: path.basename(filePath) };
  } catch {
    return null;
  }
}

/**
 * Resolve logo for outbound customer/vendor email.
 * Prefers inline CID attachment (reliable in email clients); preview uses a data URL.
 * @param {{ ownerEmail: string, logoUrl?: string, baseUrl?: string, forPreview?: boolean }} opts
 */
export function resolveShopEmailLogo({ ownerEmail, logoUrl, baseUrl = "", forPreview = false }) {
  const file = readShopSettingsLogoFile(ownerEmail, logoUrl);
  if (file) {
    if (forPreview) {
      const dataUrl = `data:${file.contentType};base64,${file.buffer.toString("base64")}`;
      return {
        logoSrc: dataUrl,
        logoCid: "",
        attachments: [],
      };
    }
    return {
      logoSrc: `cid:${SHOP_EMAIL_LOGO_CID}`,
      logoCid: SHOP_EMAIL_LOGO_CID,
      attachments: [
        {
          filename: file.filename || "logo.png",
          content: file.buffer,
          contentType: file.contentType,
          cid: SHOP_EMAIL_LOGO_CID,
        },
      ],
    };
  }

  const logoPath = normalizeShopSettingsLogoPath(logoUrl);
  if (logoPath.startsWith("/uploads/shop-settings/") && baseUrl) {
    return {
      logoSrc: `${String(baseUrl).replace(/\/$/, "")}${logoPath}`,
      logoCid: "",
      attachments: [],
    };
  }

  return { logoSrc: "", logoCid: "", attachments: [] };
}
