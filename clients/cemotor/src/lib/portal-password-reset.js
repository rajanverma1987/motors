/**
 * Shop portal password reset tokens (hash stored; plain token only in email).
 */
import crypto from "crypto";

export const PORTAL_RESET_TTL_MS = 60 * 60 * 1000;

export function createPortalResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPortalResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

/** @param {import("mongoose").Document} user */
export function issuePortalPasswordReset(user) {
  const token = createPortalResetToken();
  user.passwordResetTokenHash = hashPortalResetToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + PORTAL_RESET_TTL_MS);
  return token;
}

export function isPortalResetTokenLive(expiresAt) {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time > Date.now();
}

export function buildPortalResetUrl(siteOrigin, token) {
  const base = String(siteOrigin || "").replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
