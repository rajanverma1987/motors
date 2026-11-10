/**
 * Canonical public site origin for emails, customer/vendor links, and share URLs.
 * Never returns localhost so messages are safe to send from dev/staging servers.
 */

const DEFAULT_PUBLIC_SITE_URL = "https://3phaseflow.com";

const APEX_HOSTS = new Set(["3phaseflow.com", "www.3phaseflow.com"]);

const LEGACY_HOSTS = new Set([
  "motorswinding.com",
  "www.motorswinding.com",
  "iqmotorbase.com",
  "www.iqmotorbase.com",
]);

function stripTrailingSlash(u) {
  return String(u || "").replace(/\/+$/, "");
}

function isLocalhostHost(hostname) {
  if (!hostname) return true;
  const h = String(hostname).toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}

function isLocalhostUrl(url) {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return isLocalhostHost(new URL(u).hostname);
  } catch {
    return /localhost|127\.0\.0\.1/i.test(String(url));
  }
}

function normalizeSiteUrl(raw) {
  let u = stripTrailingSlash(String(raw || "").trim());
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  if (isLocalhostUrl(u)) return "";
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    // Force canonical brand domain even if old env vars remain.
    if (LEGACY_HOSTS.has(host)) {
      parsed.hostname = "3phaseflow.com";
    }
    if (parsed.protocol === "http:" && !isLocalhostHost(parsed.hostname)) {
      parsed.protocol = "https:";
    }
    u = parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
  return stripTrailingSlash(u);
}

function isClientApp() {
  return String(process.env.APP_ROLE || "").toLowerCase() === "client";
}

function isApexHost(hostname) {
  return APEX_HOSTS.has(String(hostname || "").toLowerCase());
}

function hostnameOfSiteUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Shop apps must not print time clock, email, or QR links on the marketing host. */
function shopOriginFromAllowedHosts() {
  if (!isClientApp()) return "";
  const hosts = String(process.env.ALLOWED_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const shop = hosts.find((h) => !isLocalhostHost(h) && !isApexHost(h));
  return shop ? `https://${shop}` : "";
}

function configuredSiteUrl({ allowApex }) {
  for (const key of ["NEXT_PUBLIC_SITE_URL", "SITE_URL"]) {
    const u = normalizeSiteUrl(process.env[key]);
    if (!u) continue;
    if (!allowApex && isApexHost(hostnameOfSiteUrl(u))) continue;
    return u;
  }
  if (process.env.VERCEL_URL) {
    const host = String(process.env.VERCEL_URL).replace(/^https?:\/\//, "").split("/")[0];
    const u = normalizeSiteUrl(`https://${host}`);
    if (u && (allowApex || !isApexHost(hostnameOfSiteUrl(u)))) return u;
  }
  return "";
}

/**
 * @param {Request} [request] Optional; used only when env/VERCEL are missing/localhost to read x-forwarded-host (must not be localhost).
 */
export function getPublicSiteUrl(request) {
  if (isClientApp()) {
    const fromEnv = configuredSiteUrl({ allowApex: false });
    if (fromEnv) return fromEnv;
    if (request) {
      const fromProxy = getSafeForwardedOrigin(request);
      if (fromProxy && !isApexHost(hostnameOfSiteUrl(fromProxy))) return fromProxy;
    }
    const fromAllowed = shopOriginFromAllowedHosts();
    if (fromAllowed) return fromAllowed;
  }

  const fromEnv = configuredSiteUrl({ allowApex: true });
  if (fromEnv) return fromEnv;
  if (request) {
    const fromProxy = getSafeForwardedOrigin(request);
    if (fromProxy) return fromProxy;
  }
  return stripTrailingSlash(DEFAULT_PUBLIC_SITE_URL);
}

function getSafeForwardedOrigin(request) {
  try {
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
    if (!host) return "";
    const hostname = host.split(":")[0];
    if (isLocalhostHost(hostname)) return "";
    let proto = (request.headers.get("x-forwarded-proto") || "https").split(",")[0].trim().toLowerCase();
    if (proto !== "http" && proto !== "https") proto = "https";
    return normalizeSiteUrl(`${proto}://${host}`);
  } catch {
    return "";
  }
}
