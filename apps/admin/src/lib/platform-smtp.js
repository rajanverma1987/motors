import nodemailer from "nodemailer";

/**
 * 3PhaseFlow platform SMTP (password reset / platform auth mail).
 * Prefer PLATFORM_SMTP_*; fall back to SMTP_* so admin/monolith configs keep working.
 */
export function getPlatformSmtpCredentials() {
  const user = String(process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER || "").trim();
  const pass = String(process.env.PLATFORM_SMTP_PASS || process.env.SMTP_PASS || "").trim();
  return { user, pass };
}

export function hasPlatformSmtp() {
  const { user, pass } = getPlatformSmtpCredentials();
  return Boolean(user && pass);
}

export function getPlatformSmtpFrom() {
  const from = String(process.env.EMAIL_FROM || "").trim();
  if (from) return from;
  const { user } = getPlatformSmtpCredentials();
  return user ? `3PhaseFlow <${user}>` : "";
}

let cached = null;
export function getPlatformSmtpTransport() {
  if (cached) return cached;
  const { user, pass } = getPlatformSmtpCredentials();
  if (!user || !pass) return null;
  cached = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cached;
}
