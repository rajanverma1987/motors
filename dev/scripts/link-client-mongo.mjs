#!/usr/bin/env node
/**
 * Point clients/{slug}/.env MONGODB_URI at 3pf_{slug} on the same cluster as root .env.
 *
 * node scripts/link-client-mongo.mjs --slug cemotor
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { repoRoot } from "./_paths.mjs";

config({ path: join(repoRoot, ".env") });

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function withDbName(uri, dbName) {
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

function dbNameOf(uri) {
  try {
    return new URL(uri).pathname.replace(/^\//, "") || "(default)";
  } catch {
    return "(parse-fail)";
  }
}

const slug = String(arg("slug")).trim().toLowerCase();
if (!slug) {
  console.error("Required: --slug");
  process.exit(1);
}

const baseUri = process.env.MONGODB_URI || "";
if (!baseUri) {
  console.error("Root .env MONGODB_URI required");
  process.exit(1);
}

const mongoDbName = `3pf_${slug.replace(/-/g, "_")}`;
const clientUri = withDbName(baseUri, mongoDbName);
const envPath = join(repoRoot, "clients", slug, ".env");

if (!existsSync(envPath)) {
  console.error("Missing", envPath);
  process.exit(1);
}

let text = readFileSync(envPath, "utf8");
if (/^MONGODB_URI=/m.test(text)) {
  text = text.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${clientUri}`);
} else {
  text = `${text.trimEnd()}\nMONGODB_URI=${clientUri}\n`;
}

if (!/^TENANT_SLUG=/m.test(text)) {
  text += `TENANT_SLUG=${slug}\n`;
} else {
  text = text.replace(/^TENANT_SLUG=.*$/m, `TENANT_SLUG=${slug}`);
}
if (!/^APP_ROLE=/m.test(text)) {
  text += `APP_ROLE=client\n`;
}

writeFileSync(envPath, text);
console.log("Updated", envPath);
console.log({ mongoDbName, db: dbNameOf(clientUri) });
console.log("Restart clients/" + slug + " (npm run dev) to pick up the new URI.");
