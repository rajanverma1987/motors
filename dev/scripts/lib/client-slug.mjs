/**
 * DNS-safe slug from a customer / company name.
 * "Clearwater Electric Motor Repair LLC" → "clearwater"
 * "Acme Motors" → "acme-motors" (shortened if needed)
 */
const STOP = new Set([
  "llc",
  "inc",
  "ltd",
  "co",
  "company",
  "corp",
  "corporation",
  "the",
  "and",
  "of",
  "electric",
  "motor",
  "motors",
  "repair",
  "shop",
  "service",
  "services",
]);

export function slugifyCustomerName(name) {
  const raw = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!raw) return "";

  const parts = raw.split(/\s+/).filter(Boolean);
  const kept = parts.filter((p) => !STOP.has(p));
  const use = (kept.length ? kept : parts).slice(0, 3);
  let slug = use.join("-").replace(/^-+|-+$/g, "");
  if (!slug) slug = parts[0] || "shop";
  slug = slug.slice(0, 48).replace(/-+$/g, "");
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    slug = slug.replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "") || "shop";
  }
  return slug;
}

export function withDbName(uri, dbName) {
  try {
    const u = new URL(uri);
    u.pathname = `/${dbName}`;
    return u.toString();
  } catch {
    if (uri.includes("?")) {
      const [pre, q] = uri.split("?");
      const base = pre.replace(/\/[^/?]*$/, "");
      return `${base}/${dbName}?${q}`;
    }
    return `${uri.replace(/\/?$/, "")}/${dbName}`;
  }
}

/** Reserved server range: 5080–5200. 5080 admin, 5081 marketing, 5082+ shops. */
export const PORT_ADMIN = 5080;
export const PORT_MARKETING = 5081;
export const PORT_SHOPS_START = 5082;
export const PORT_SHOPS_END = 5200;

export function nextClientPort(repoRoot, fs) {
  const clientsDir = `${repoRoot}/clients`;
  let max = PORT_SHOPS_START - 1;
  if (!fs.existsSync(clientsDir)) return PORT_SHOPS_START;
  for (const name of fs.readdirSync(clientsDir)) {
    const envPath = `${clientsDir}/${name}/.env`;
    if (!fs.existsSync(envPath)) continue;
    const m = fs.readFileSync(envPath, "utf8").match(/^PORT=(\d+)/m);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const next = max + 1;
  if (next > PORT_SHOPS_END) {
    throw new Error(`No free shop ports left in ${PORT_SHOPS_START}-${PORT_SHOPS_END}`);
  }
  return next;
}
