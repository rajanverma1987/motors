/**
 * Generates public/sitemap.xml with all marketing pages (discovered from app dir + location pages + listing slugs from DB).
 * Run before git push so the sitemap is committed. Needs MONGODB_URI and NEXT_PUBLIC_SITE_URL in .env.
 */
const fs = require("fs");
const path = require("path");

// Load .env from project root
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env") });
require("dotenv").config({ path: path.join(root, ".env.local") });

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "");

const MARKETING_APP_DIR = path.join(root, "src", "app", "(marketing)");
const PAGE_FILES = ["page.js", "page.jsx", "page.ts", "page.tsx"];

/**
 * Discover static marketing routes by scanning src/app/(marketing) for page.js/jsx/ts/tsx.
 * Skips dynamic segments (e.g. [slug]) – those come from DB.
 */
function discoverMarketingPages() {
  const pages = [];
  if (!fs.existsSync(MARKETING_APP_DIR)) return pages;

  function walk(dir, segments = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const name = e.name;
      const fullPath = path.join(dir, name);
      if (e.isDirectory()) {
        if (name.startsWith("(") && name.endsWith(")")) {
          walk(fullPath, segments);
        } else if (name.startsWith("[")) {
          // dynamic segment – skip (URLs come from DB)
        } else {
          walk(fullPath, [...segments, name]);
        }
      } else if (PAGE_FILES.includes(name)) {
        const urlPath = segments.length === 0 ? "" : "/" + segments.join("/");
        pages.push({ path: urlPath, priority: "0.8", changefreq: "monthly" });
      }
    }
  }

  walk(MARKETING_APP_DIR);
  // Home gets higher priority
  const home = pages.find((p) => p.path === "");
  if (home) home.priority = "1.0";
  if (home) home.changefreq = "weekly";
  return pages;
}

function slugify(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getListingSlug(companyName, id) {
  const base = slugify(companyName);
  const safeId = (id || "").trim();
  if (!safeId) return base || "listing";
  return base ? `${base}-${safeId}` : safeId;
}

function escapeXml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, lastmod, changefreq, priority) {
  const lastmodStr = lastmod ? new Date(lastmod).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmodStr}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function fetchDynamicUrls() {
  const mongoose = require("mongoose");
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI not set – sitemap will contain static pages only.");
    return { locationPages: [], listingSlugs: [] };
  }
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const locationPages = await db
      .collection("locationpages")
      .find({ status: "active" }, { projection: { slug: 1, updatedAt: 1 } })
      .toArray();

    const listings = await db
      .collection("listings")
      .find({ status: "approved" }, { projection: { companyName: 1, _id: 1 } })
      .toArray();

    const listingSlugs = listings.map((l) => ({
      slug: getListingSlug(l.companyName, l._id.toString()),
      updatedAt: l.updatedAt,
    }));

    await mongoose.disconnect();
    return { locationPages, listingSlugs };
  } catch (err) {
    console.warn("DB fetch for sitemap failed – using static pages only:", err.message);
    return { locationPages: [], listingSlugs: [] };
  }
}

async function main() {
  const entries = [];
  const staticPages = discoverMarketingPages();

  for (const p of staticPages) {
    entries.push(urlEntry(`${baseUrl}${p.path}`, new Date(), p.changefreq, p.priority));
  }

  const { locationPages, listingSlugs } = await fetchDynamicUrls();

  for (const p of locationPages) {
    entries.push(
      urlEntry(
        `${baseUrl}/motor-repair-shop/${encodeURIComponent(p.slug || "")}`,
        p.updatedAt,
        "weekly",
        "0.7"
      )
    );
  }

  for (const l of listingSlugs) {
    if (l.slug) {
      entries.push(
        urlEntry(
          `${baseUrl}/electric-motor-reapir-shops-listings/${encodeURIComponent(l.slug)}`,
          l.updatedAt,
          "weekly",
          "0.7"
        )
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  const outPath = path.join(root, "public", "sitemap.xml");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, xml, "utf8");
  console.log("Wrote sitemap.xml with", entries.length, "URLs (" + staticPages.length + " marketing pages,", locationPages.length, "location pages,", listingSlugs.length, "listings).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
