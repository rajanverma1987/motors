/**
 * Writes public/sitemap.xml using the same URL list as src/app/sitemap.js (src/lib/sitemap-url-entries.js).
 * Run before git push (`npm run git`) so the static file matches Next.js metadata and includes:
 * - USA hub, state, and ALL city pages (e.g. /usa/texas/houston/motor-repair-business-listing)
 * - DB-backed: location pages, marketplace items, career postings
 *
 * Needs MONGODB_URI and NEXT_PUBLIC_SITE_URL (or SITE_URL) in .env for full URLs.
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(root, ".env") });
require("dotenv").config({ path: path.join(root, ".env.local") });

function escapeXml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(entry) {
  const loc = entry.url;
  const lastmod = entry.lastModified
    ? new Date(entry.lastModified).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const changefreq = entry.changeFrequency || "weekly";
  const priority = entry.priority != null ? String(entry.priority) : "0.5";
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: {
      "@": path.join(root, "src"),
    },
  });

  const { getSitemapEntries } = jiti(path.join(root, "src/lib/sitemap-url-entries.js"));

  let entries;
  try {
    entries = await getSitemapEntries();
  } catch (err) {
    console.error("getSitemapEntries failed:", err.message || err);
    process.exit(1);
  }

  const urlNodes = entries.map((e) => urlEntry(e));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes.join("\n")}
</urlset>
`;

  const outPath = path.join(root, "public", "sitemap.xml");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, xml, "utf8");

  const usaCityCount = entries.filter((e) => e.url && /\/usa\/[^/]+\/[^/]+\/motor-repair-business-listing$/.test(e.url)).length;
  console.log(
    "Wrote sitemap.xml with",
    entries.length,
    "URLs (including",
    usaCityCount,
    "USA city SEO pages)."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Close DB or npm run git / execSync stays blocked forever (mongoose keeps the event loop alive).
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {
      /* ignore */
    }
    if (process.exitCode) process.exit(process.exitCode);
  });
