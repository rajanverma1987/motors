#!/usr/bin/env node
/**
 * Upsert GoDaddy DNS CNAME (or A) for {slug}.3phaseflow.com → CLIENT_SERVER_HOST.
 * Secrets from env only (never commit).
 *
 * Usage: node scripts/dns-upsert.mjs --slug cemotor
 *        node scripts/dns-upsert.mjs --slug admin
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { devRoot, repoRoot } from "./_paths.mjs";

config({ path: resolve(repoRoot, ".env") });

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const slug = String(arg("slug")).trim().toLowerCase();
const skip = process.argv.includes("--skip-dns");

if (!slug) {
  console.error("Usage: node scripts/dns-upsert.mjs --slug <subdomain>");
  process.exit(1);
}
if (skip) {
  console.log("dns-upsert: skipped (--skip-dns)");
  process.exit(0);
}

const key = process.env.GODADDY_API_KEY || "";
const secret = process.env.GODADDY_API_SECRET || "";
const domain = process.env.GODADDY_DOMAIN || "3phaseflow.com";
const hostTarget = process.env.CLIENT_SERVER_HOST || "";
const ip = process.env.CLIENT_SERVER_IP || "";
// Default A when IP is set (Infodatix: CNAME to sql.infodatixhosting.com often fails; A works)
const recordType = (
  process.env.GODADDY_RECORD_TYPE || (ip ? "A" : "CNAME")
).toUpperCase();
const ttl = Number(process.env.GODADDY_TTL || 600);

if (!key || !secret) {
  console.error("GODADDY_API_KEY / GODADDY_API_SECRET required");
  process.exit(1);
}

const data =
  recordType === "A"
    ? [{ data: ip, ttl }]
    : [{ data: hostTarget.replace(/\.$/, "") + (hostTarget.endsWith(".") ? "" : ""), ttl, port: 1, weight: 1 }];

if (recordType === "A" && !ip) {
  console.error("CLIENT_SERVER_IP required for A records");
  process.exit(1);
}
if (recordType === "CNAME" && !hostTarget) {
  console.error("CLIENT_SERVER_HOST required for CNAME records");
  process.exit(1);
}

// GoDaddy CNAME data should not include trailing domain sometimes — use hostname as given
const records =
  recordType === "CNAME"
    ? [{ data: hostTarget.replace(/\.$/, ""), ttl }]
    : [{ data: ip, ttl }];

const url = `https://api.godaddy.com/v1/domains/${domain}/records/${recordType}/${encodeURIComponent(slug)}`;
const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `sso-key ${key}:${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(records),
});

if (!res.ok) {
  const text = await res.text();
  console.error("GoDaddy error", res.status, text);
  process.exit(1);
}

console.log(`OK: ${slug}.${domain} ${recordType} → ${recordType === "A" ? ip : hostTarget}`);
