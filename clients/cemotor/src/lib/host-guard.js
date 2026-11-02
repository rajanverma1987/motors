/**
 * Host allowlists for multi-host apps.
 * APP_ROLE: marketing | admin | client
 * ALLOWED_HOSTS: comma-separated hosts (optional override)
 */

export function getAppRole() {
  return String(process.env.APP_ROLE || "monolith").trim().toLowerCase();
}

export function getAllowedHosts() {
  const raw = String(process.env.ALLOWED_HOSTS || "").trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  const role = getAppRole();
  if (role === "marketing") {
    return ["3phaseflow.com", "www.3phaseflow.com", "localhost", "127.0.0.1"];
  }
  if (role === "admin") {
    return ["admin.3phaseflow.com", "localhost", "127.0.0.1"];
  }
  if (role === "client") {
    const slug = String(process.env.TENANT_SLUG || "").trim().toLowerCase();
    const host = String(process.env.TENANT_HOST || (slug ? `${slug}.3phaseflow.com` : "")).toLowerCase();
    const list = ["localhost", "127.0.0.1"];
    if (host) list.unshift(host);
    return list;
  }
  return null; // monolith: no host restriction
}

export function hostAllowed(hostHeader) {
  const allowed = getAllowedHosts();
  if (!allowed) return true;
  const host = String(hostHeader || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  if (!host) return false;
  return allowed.includes(host);
}
