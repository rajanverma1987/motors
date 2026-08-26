/**
 * CSRF mitigation for cookie-authenticated API mutations.
 * Rejects cross-origin POST/PUT/PATCH/DELETE when Origin/Host do not match.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
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

  const hostHeader = request.headers.get("host") || "";
  const expectedHost = normalizeHost(hostHeader);
  if (!expectedHost) {
    return { ok: false, status: 403, error: "Invalid host" };
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = normalizeHost(new URL(origin).host);
      if (originHost !== expectedHost) {
        return { ok: false, status: 403, error: "Cross-origin request blocked" };
      }
      return { ok: true };
    } catch {
      return { ok: false, status: 403, error: "Invalid origin" };
    }
  }

  const secFetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (secFetchSite === "cross-site") {
    return { ok: false, status: 403, error: "Cross-site request blocked" };
  }

  // Non-browser clients (mobile apps, server scripts) may omit Origin.
  return { ok: true };
}
