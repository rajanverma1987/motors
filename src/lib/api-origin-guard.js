/**
 * CSRF mitigation for cookie-authenticated API mutations.
 * Rejects cross-origin POST/PUT/PATCH/DELETE when Origin is not an allowed site host.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

/** www.example.com ↔ example.com */
function withWwwVariants(host) {
  const h = normalizeHost(host);
  if (!h) return [];
  const out = new Set([h]);
  if (h.startsWith("www.")) {
    out.add(h.slice(4));
  } else if (!h.includes(".localhost") && h !== "localhost" && h !== "127.0.0.1") {
    out.add(`www.${h}`);
  }
  return [...out];
}

function addHostVariants(set, host) {
  for (const v of withWwwVariants(host)) {
    set.add(v);
  }
}

function hostFromUrlLike(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const u = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return normalizeHost(u.host);
  } catch {
    return normalizeHost(raw.split("/")[0]);
  }
}

/**
 * Hostnames treated as same-site for dashboard API mutations.
 * Includes Host, forwarded host, SITE_URL, and www/non-www pairs.
 * @param {Request} request
 */
function buildAllowedApiHosts(request) {
  const allowed = new Set();

  const hostHeader = request.headers.get("host") || "";
  addHostVariants(allowed, hostHeader);

  const forwardedHost = String(request.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  if (forwardedHost) {
    addHostVariants(allowed, forwardedHost);
  }

  for (const key of ["NEXT_PUBLIC_SITE_URL", "SITE_URL"]) {
    addHostVariants(allowed, hostFromUrlLike(process.env[key]));
  }

  if (process.env.VERCEL_URL) {
    addHostVariants(allowed, process.env.VERCEL_URL);
  }

  const extra = String(process.env.ALLOWED_API_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const entry of extra) {
    addHostVariants(allowed, hostFromUrlLike(entry));
  }

  // Legacy domain still redirecting to IQMotorBase
  addHostVariants(allowed, "motorswinding.com");

  return allowed;
}

function hostFromHeaderUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return normalizeHost(new URL(raw).host);
  } catch {
    return "";
  }
}

function isAllowedOriginHost(originHost, allowed) {
  if (!originHost) return false;
  return allowed.has(originHost);
}

/**
 * @param {Request} request
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function assertSameOriginApiMutation(request) {
  const method = String(request.method || "GET").toUpperCase();
  if (!MUTATION_METHODS.has(method)) {
    return { ok: true };
  }

  const allowed = buildAllowedApiHosts(request);
  if (!allowed.size) {
    return { ok: false, status: 403, error: "Invalid host" };
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const originHost = hostFromHeaderUrl(origin);
    if (isAllowedOriginHost(originHost, allowed)) {
      return { ok: true };
    }
    // Some proxies strip www inconsistently — allow Referer when Origin mismatches Host only.
    const referer = request.headers.get("referer");
    const refererHost = hostFromHeaderUrl(referer);
    if (isAllowedOriginHost(refererHost, allowed)) {
      return { ok: true };
    }
    return { ok: false, status: 403, error: "Cross-origin request blocked" };
  }

  const secFetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (secFetchSite === "cross-site") {
    return { ok: false, status: 403, error: "Cross-site request blocked" };
  }

  // Non-browser clients (mobile apps, server scripts) may omit Origin.
  return { ok: true };
}
