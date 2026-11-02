#!/usr/bin/env node
/**
 * Copy Clearwater (or any shop) files from public/uploads into shop_uploads/{slug}/.
 * Owner keys in paths are often email-derived (lowercase, sanitized).
 *
 * node scripts/migrate-shop-uploads.mjs --slug cemotor --owner-email cemotorrepair@gmail.com
 */
import { config } from "dotenv";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { join, resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { devRoot, repoRoot } from "./_paths.mjs";

const root = repoRoot;
const appRoot = devRoot;
config({ path: join(root, ".env") });

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const slug = String(arg("slug")).trim().toLowerCase();
const ownerEmail = String(arg("owner-email")).trim().toLowerCase();
const srcRoot = resolve(arg("from", join(appRoot, "public", "uploads")));
const destRoot = resolve(arg("to", join(root, "shop_uploads", slug)));

if (!slug || !ownerEmail) {
  console.error("Required: --slug --owner-email");
  process.exit(1);
}

const ownerKey = ownerEmail.replace(/[^a-z0-9@._-]/gi, "_").toLowerCase();
const emailLocal = ownerEmail.split("@")[0];

function pathMatchesOwner(p) {
  const s = p.toLowerCase();
  return s.includes(ownerKey) || s.includes(ownerEmail) || s.includes(emailLocal);
}

let copied = 0;
let skipped = 0;

function walk(dir, base) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    const rel = relative(base, full);
    if (st.isDirectory()) {
      walk(full, base);
      continue;
    }
    if (!pathMatchesOwner(rel) && !pathMatchesOwner(full)) {
      skipped += 1;
      continue;
    }
    const dest = join(destRoot, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(full, dest);
    copied += 1;
  }
}

mkdirSync(destRoot, { recursive: true });
console.log({ srcRoot, destRoot, ownerEmail, ownerKey });
walk(srcRoot, srcRoot);
writeFileSync(
  join(destRoot, "_migrate-report.json"),
  JSON.stringify({ copied, skipped, ownerEmail, at: new Date().toISOString() }, null, 2)
);
console.log(`Copied ${copied} files (skipped ${skipped} non-matching). Dest: ${destRoot}`);
console.log("Set SHOP_UPLOADS_ROOT to this folder in the client .env (provision does this).");
