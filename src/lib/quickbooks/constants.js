/** Stored on synced local docs for idempotent upserts. */
export const QBO_SOURCE_SYSTEM = "quickbooks_online";

export const QBO_OAUTH_SCOPE = "com.intuit.quickbooks.accounting";

export function intuitAuthBaseUrl() {
  return "https://appcenter.intuit.com/connect/oauth2";
}

export function intuitTokenUrl() {
  return "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
}

export function intuitRevokeUrl() {
  return "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
}

export function qboApiBaseUrl() {
  const env = String(process.env.INTUIT_ENV || "sandbox").toLowerCase();
  return env === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export function intuitConfigured() {
  return !!(
    process.env.INTUIT_CLIENT_ID &&
    process.env.INTUIT_CLIENT_SECRET &&
    process.env.INTUIT_REDIRECT_URI
  );
}

export function intuitClientId() {
  return String(process.env.INTUIT_CLIENT_ID || "").trim();
}

export function intuitClientSecret() {
  return String(process.env.INTUIT_CLIENT_SECRET || "").trim();
}

export function intuitRedirectUri() {
  return String(process.env.INTUIT_REDIRECT_URI || "").trim();
}
