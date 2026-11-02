#!/usr/bin/env node
/**
 * Remove PLATFORM_SMTP_* and EMAIL_FROM from clients/cemotor/.env
 * (password-reset mail is sent by admin via PLATFORM_API_BASE).
 * Ensures PLATFORM_TENANT_KEY exists and matches Tenant.platformTenantKeyHash.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { config } from "dotenv";
import { repoRoot } from "./_paths.mjs";

config({ path: join(repoRoot, ".env") });

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

function removeKeys(text, keys) {
  let out = text;
  for (const key of keys) {
    out = out.replace(new RegExp(`^${key}=.*\\n?`, "gm"), "");
  }
  return out.replace(/\n{3,}/g, "\n\n");
}

const cemotorPath = join(repoRoot, "clients/cemotor/.env");
let text = readFileSync(cemotorPath, "utf8");
text = removeKeys(text, ["PLATFORM_SMTP_USER", "PLATFORM_SMTP_PASS", "EMAIL_FROM", "SMTP_USER", "SMTP_PASS"]);

const cur = parseEnv(text);
let tenantKey = String(cur.PLATFORM_TENANT_KEY || "").trim();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Root MONGODB_URI required to sync tenant key");
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
        platformTenantKeyHash: String,
        supportHandoffSecret: String,
      },
      { timestamps: true }
    )
  );

const slug = "cemotor";
let row = await Tenant.findOne({ slug });
if (!row) {
  console.error("Tenant cemotor missing. Run ensure-cemotor-tenant.mjs first.");
  await conn.close();
  process.exit(1);
}

if (!tenantKey) {
  tenantKey = `3pf_${randomBytes(24).toString("base64url")}`;
  text = upsert(text, "PLATFORM_TENANT_KEY", tenantKey);
  await Tenant.updateOne(
    { _id: row._id },
    { $set: { platformTenantKeyHash: await bcrypt.hash(tenantKey, 10) } }
  );
  console.log("Generated PLATFORM_TENANT_KEY and stored hash on Tenant");
} else if (!row.platformTenantKeyHash) {
  await Tenant.updateOne(
    { _id: row._id },
    { $set: { platformTenantKeyHash: await bcrypt.hash(tenantKey, 10) } }
  );
  console.log("Stored hash for existing PLATFORM_TENANT_KEY");
} else {
  const ok = await bcrypt.compare(tenantKey, row.platformTenantKeyHash);
  if (!ok) {
    await Tenant.updateOne(
      { _id: row._id },
      { $set: { platformTenantKeyHash: await bcrypt.hash(tenantKey, 10) } }
    );
    console.log("Re-hashed PLATFORM_TENANT_KEY onto Tenant (key did not match)");
  } else {
    console.log("PLATFORM_TENANT_KEY already matches Tenant");
  }
}

if (!/^PLATFORM_API_BASE=/m.test(text)) {
  text = upsert(text, "PLATFORM_API_BASE", "http://localhost:5067");
}

writeFileSync(cemotorPath, text.endsWith("\n") ? text : `${text}\n`);
await conn.close();
console.log("Removed PLATFORM_SMTP_* / EMAIL_FROM from clients/cemotor/.env");
