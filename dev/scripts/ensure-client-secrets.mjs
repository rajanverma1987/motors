#!/usr/bin/env node
/**
 * Ensure clients/{slug}/.env has PLATFORM_TENANT_KEY + SUPPORT_HANDOFF_SECRET
 * and Tenant row hashes match. Safe to re-run.
 *
 * node scripts/ensure-client-secrets.mjs --slug cemotor
 * node scripts/ensure-client-secrets.mjs --all
 */
import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { repoRoot } from "./_paths.mjs";

config({ path: join(repoRoot, ".env") });

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function upsert(text, key, value) {
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, "m"), line);
  }
  return `${text.trimEnd()}\n${line}\n`;
}

async function ensureSlug(slug, Tenant) {
  const envPath = join(repoRoot, "clients", slug, ".env");
  if (!existsSync(envPath)) {
    console.warn("skip (no .env):", slug);
    return;
  }
  let text = readFileSync(envPath, "utf8");
  const cur = parseEnv(text);

  let tenantKey = String(cur.PLATFORM_TENANT_KEY || "").trim();
  let handoff = String(cur.SUPPORT_HANDOFF_SECRET || "").trim();
  let changed = false;

  if (!tenantKey) {
    tenantKey = `3pf_${randomBytes(24).toString("base64url")}`;
    text = upsert(text, "PLATFORM_TENANT_KEY", tenantKey);
    changed = true;
  }
  if (!handoff) {
    handoff = randomBytes(32).toString("hex");
    text = upsert(text, "SUPPORT_HANDOFF_SECRET", handoff);
    text = upsert(text, "PLATFORM_WEBHOOK_SECRET", handoff);
    changed = true;
  } else if (!String(cur.PLATFORM_WEBHOOK_SECRET || "").trim()) {
    text = upsert(text, "PLATFORM_WEBHOOK_SECRET", handoff);
    changed = true;
  }
  if (!String(cur.PLATFORM_API_BASE || "").trim()) {
    text = upsert(text, "PLATFORM_API_BASE", "http://localhost:5080");
    changed = true;
  }
  if (!String(cur.TENANT_SLUG || "").trim()) {
    text = upsert(text, "TENANT_SLUG", slug);
    changed = true;
  }

  if (changed) {
    writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`);
    console.log("Updated .env secrets:", slug);
  }

  const keyHash = await bcrypt.hash(tenantKey, 10);
  const host = String(cur.TENANT_HOST || `${slug}.3phaseflow.com`).trim().toLowerCase();
  const ownerEmail = String(cur.TENANT_OWNER_EMAIL || "").trim().toLowerCase();
  const mongoDbName = `3pf_${slug.replace(/-/g, "_")}`;
  const port = Number(cur.PORT || 0) || null;

  await Tenant.updateOne(
    { slug },
    {
      $set: {
        slug,
        host,
        ownerEmail,
        mongoDbName,
        codePath: `clients/${slug}`,
        status: "active",
        platformTenantKeyHash: keyHash,
        supportHandoffSecret: handoff,
        webhookUrl: `https://${host}/api/platform/inbound/lead`,
        ...(port ? { port } : {}),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        companyName: slug,
        dnsStatus: "pending",
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Tenant synced:", slug);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required in root .env");
  process.exit(1);
}

const conn = await mongoose.createConnection(uri).asPromise();
const Tenant =
  conn.models.Tenant ||
  conn.model(
    "Tenant",
    new mongoose.Schema(
      {
        slug: String,
        host: String,
        companyName: String,
        ownerEmail: String,
        mongoDbName: String,
        codePath: String,
        status: String,
        platformTenantKeyHash: String,
        supportHandoffSecret: String,
        webhookUrl: String,
        dnsStatus: String,
        port: Number,
      },
      { timestamps: true, strict: false }
    )
  );

const clientsRoot = join(repoRoot, "clients");
let slugs = [];
if (hasFlag("all")) {
  slugs = existsSync(clientsRoot)
    ? readdirSync(clientsRoot).filter((n) => existsSync(join(clientsRoot, n, ".env")))
    : [];
} else {
  const slug = String(arg("slug")).trim().toLowerCase();
  if (!slug) {
    console.error("Usage: --slug cemotor   or   --all");
    process.exit(1);
  }
  slugs = [slug];
}

for (const slug of slugs) {
  await ensureSlug(slug, Tenant);
}

await conn.close();
console.log("Done.");
