/**
 * In-memory rate limiter for API routes. Use for auth, public forms, and uploads.
 * For multi-instance production later, add Redis (see documents/PlatformSecurity.md).
 */
const store = new Map();
const WINDOW_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function getRateLimitClientKey(request, routeId) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown";
  return `${routeId}:${ip}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (now - data.start > WINDOW_MS) store.delete(key);
  }
}
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

/**
 * Check rate limit. Returns { allowed: boolean, remaining: number }.
 * @param {Request} request - Next.js request
 * @param {string} routeId - e.g. "login", "register", "lead", "area-notify", "upload-logo"
 * @param {number} maxPerWindow - max requests per window (default 10)
 */
export async function checkRateLimit(request, routeId, maxPerWindow = 10) {
  const key = getRateLimitClientKey(request, routeId);
  const now = Date.now();
  let data = store.get(key);
  if (!data || now - data.start > WINDOW_MS) {
    data = { start: now, count: 0 };
    store.set(key, data);
  }
  data.count += 1;
  const allowed = data.count <= maxPerWindow;
  const remaining = Math.max(0, maxPerWindow - data.count);
  return { allowed, remaining };
}
