#!/usr/bin/env node
/**
 * Post-build IndexNow submission (Bing, Yandex, etc.).
 * Runs after `next build` via npm `postbuild` when INDEXNOW_KEY is set.
 *
 * Requires: INDEXNOW_KEY, NEXT_PUBLIC_SITE_URL or SITE_URL, MONGODB_URI (for full URL list like sitemap).
 * Writes public/{INDEXNOW_KEY}.txt for verification (IndexNow spec).
 *
 * @see https://www.indexnow.org/documentation
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createJiti } from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const INDEXNOW_MAX_URLS = 10000;

async function main() {
  const key = process.env.INDEXNOW_KEY?.trim();
  const siteUrlRaw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

  if (!key) {
    console.log("[indexnow] Skip: INDEXNOW_KEY not set.");
    process.exit(0);
  }
  if (!siteUrlRaw) {
    console.warn("[indexnow] Skip: set NEXT_PUBLIC_SITE_URL or SITE_URL to your public origin (e.g. https://motorswinding.com).");
    process.exit(0);
  }

  let base;
  try {
    base = new URL(siteUrlRaw.startsWith("http") ? siteUrlRaw : `https://${siteUrlRaw}`);
  } catch {
    console.error("[indexnow] Invalid NEXT_PUBLIC_SITE_URL / SITE_URL");
    process.exit(1);
  }
  const origin = base.origin.replace(/\/$/, "");
  const hostname = base.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
    console.log("[indexnow] Skip: use a production site URL (IndexNow does not accept localhost).");
    process.exit(0);
  }

  const keyFilePath = path.join(root, "public", `${key}.txt`);
  if (!fs.existsSync(keyFilePath)) {
    fs.mkdirSync(path.join(root, "public"), { recursive: true });
    fs.writeFileSync(keyFilePath, key, "utf8");
    console.log(`[indexnow] Wrote verification file: public/${key}.txt`);
  }

  const keyLocation = `${origin}/${key}.txt`;

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    alias: {
      "@": path.join(root, "src"),
    },
  });

  const { getAllSitemapUrls } = jiti(path.join(root, "src/lib/sitemap-url-entries.js"));

  let urls;
  try {
    urls = await getAllSitemapUrls();
  } catch (e) {
    console.error("[indexnow] Failed to collect URLs (check MONGODB_URI for DB-backed routes):", e?.message || e);
    process.exit(1);
  }

  console.log(`[indexnow] Submitting ${urls.length} URL(s) for ${hostname}`);

  const endpoint = process.env.INDEXNOW_ENDPOINT?.trim() || "https://api.indexnow.org/indexnow";

  for (let i = 0; i < urls.length; i += INDEXNOW_MAX_URLS) {
    const chunk = urls.slice(i, i + INDEXNOW_MAX_URLS);
    const body = {
      host: hostname,
      key,
      keyLocation,
      urlList: chunk,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });

    if (res.status === 200 || res.status === 202) {
      console.log(`[indexnow] Batch OK (${chunk.length} URLs): HTTP ${res.status}`);
      continue;
    }

    const text = await res.text().catch(() => "");
    console.error(`[indexnow] Batch failed: HTTP ${res.status}`, text || "");
    process.exit(1);
  }

  console.log("[indexnow] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
