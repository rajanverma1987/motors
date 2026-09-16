/**
 * Single-use, expiring tokens for IQMotorTrack email verification and password reset (§6.2).
 * Only hashes are stored, so a database read never yields a usable link.
 */

import crypto from "crypto";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function createTrackAccountToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashTrackAccountToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function createTrackVerifyCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * @param {any} facility
 * @returns {{ token: string, code: string }}
 */
export function issueTrackEmailVerification(facility) {
  const token = createTrackAccountToken();
  const code = createTrackVerifyCode();
  facility.emailVerifyTokenHash = hashTrackAccountToken(token);
  facility.emailVerifyCode = code;
  facility.emailVerifyExpiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  return { token, code };
}

/**
 * @param {any} facility
 * @returns {string} plain token to embed in the reset link
 */
export function issueTrackPasswordReset(facility) {
  const token = createTrackAccountToken();
  facility.passwordResetTokenHash = hashTrackAccountToken(token);
  facility.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
  return token;
}

/**
 * @param {any} facility
 * @param {Date|string|null|undefined} expiresAt
 */
export function isTrackTokenLive(expiresAt) {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time > Date.now();
}

export const TRACK_VERIFY_TTL_MS = VERIFY_TTL_MS;
export const TRACK_RESET_TTL_MS = RESET_TTL_MS;
