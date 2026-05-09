#!/usr/bin/env node
/**
 * Post-build IndexNow submission (Bing, Yandex, etc.).
 * Runs after `next build` via npm `postbuild` when INDEXNOW_KEY is set.
 *
 * Default behavior: submit only changed routes inferred from git deltas.
 * Optional fallback full submit: set INDEXNOW_FALLBACK_FULL=true.
 *
 * Requires: INDEXNOW_KEY, NEXT_PUBLIC_SITE_URL or SITE_URL.
 * Writes public/{INDEXNOW_KEY}.txt for verification (IndexNow spec).
 *
 * @see https://www.indexnow.org/documentation
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createJiti } from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const INDEXNOW_MAX_URLS = 10000;

function runGit(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .trim();
  } catch {
    return "";
  }
}

function normalizeRouteFromAppDir(absDir) {
  const appRoot = path.join(root, "src", "app");
  const rel = path.relative(appRoot, absDir).split(path.sep).join("/");
  if (!rel || rel === ".") return "/";
  const cleanParts = rel
    .split("/")
    .filter(Boolean)
    .filter((part) => !(part.startsWith("(") && part.endsWith(")")))
    .filter((part) => !(part.startsWith("[") && part.endsWith("]")));
  return cleanParts.length ? `/${cleanParts.join("/")}` : "/";
}

function routeForChangedFile(relFile) {
  if (!relFile.startsWith("src/app/")) return "";
  const absFile = path.join(root, relFile);
  let cur = fs.existsSync(absFile) ? absFile : path.dirname(absFile);
  if (fs.existsSync(absFile) && fs.statSync(absFile).isFile()) cur = path.dirname(absFile);

  const appRoot = path.join(root, "src", "app");
  while (cur.startsWith(appRoot)) {
    const pageJs = path.join(cur, "page.js");
    const pageJsx = path.join(cur, "page.jsx");
    if (fs.existsSync(pageJs) || fs.existsSync(pageJsx)) {
      return normalizeRouteFromAppDir(cur);
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return "";
}

function getChangedRoutes() {
  const changed = new Set();
  // Last commit delta (best signal on CI/production builds).
  const headDelta = runGit("git diff --name-only --diff-filter=ACMRTUXB HEAD~1..HEAD");
  for (const line of headDelta.split("\n")) {
    if (line.trim()) changed.add(line.trim());
  }
  // Include local staged + unstaged deltas (useful on local build runs).
  const staged = runGit("git diff --name-only --cached --diff-filter=ACMRTUXB");
  for (const line of staged.split("\n")) {
    if (line.trim()) changed.add(line.trim());
  }
  const unstaged = runGit("git diff --name-only --diff-filter=ACMRTUXB");
  for (const line of unstaged.split("\n")) {
    if (line.trim()) changed.add(line.trim());
  }

  const routes = new Set();
  for (const file of changed) {
    const route = routeForChangedFile(file);
    if (route) routes.add(route);
  }
  return [...routes];
}

async function main() {
  const key = process.env.INDEXNOW_KEY?.trim();
  const siteUrlRaw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;

  if (!key) {
    console.log("[indexnow] Skip: INDEXNOW_KEY not set.");
    process.exit(0);
  }
  if (!siteUrlRaw) {
    console.warn("[indexnow] Skip: set NEXT_PUBLIC_SITE_URL or SITE_URL to your public origin (e.g. https://IQMotorBase.com).");
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

  let urls = [];
  const changedRoutes = getChangedRoutes();
  if (changedRoutes.length > 0) {
    urls = changedRoutes.map((r) => `${origin}${r}`);
    console.log(`[indexnow] Using changed routes from git delta (${urls.length}).`);
  } else {
    const allowFullFallback = String(process.env.INDEXNOW_FALLBACK_FULL || "").toLowerCase() === "true";
    if (!allowFullFallback) {
      console.log("[indexnow] No changed routes found; skipping submission (set INDEXNOW_FALLBACK_FULL=true to submit full sitemap).");
      process.exit(0);
    }
    const { getAllSitemapUrls } = jiti(path.join(root, "src/lib/sitemap-url-entries.js"));
    try {
      urls = await getAllSitemapUrls();
      console.log(`[indexnow] No changed routes found; fallback enabled, submitting full sitemap list (${urls.length}).`);
    } catch (e) {
      console.error("[indexnow] Failed to collect URLs (check MONGODB_URI for DB-backed routes):", e?.message || e);
      process.exit(1);
    }
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

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {
      /* ignore */
    }
    if (process.exitCode) process.exit(process.exitCode);
  });
