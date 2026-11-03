import { createHash, timingSafeEqual } from "crypto";

/**
 * Development-only shop login. Refuses production, public hosts, and a short secret.
 * @param {Request} request
 * @param {string} password
 */
export function devMasterPasswordAccepted(request, password) {
  if (process.env.NODE_ENV !== "development") return false;
  const expected = String(process.env.DEV_MASTER_PASSWORD || "").trim();
  if (expected.length < 16) return false;
  const host = hostnameFromRequest(request);
  if (!isLocalDevHost(host)) return false;
  return safeEqual(String(password || ""), expected);
}

function hostnameFromRequest(request) {
  const raw = String(request?.headers?.get?.("host") || "").trim().toLowerCase();
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end > 1 ? raw.slice(1, end) : "";
  }
  return raw.split(":")[0];
}

function isLocalDevHost(host) {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function safeEqual(a, b) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
