#!/usr/bin/env node
/**
 * Upsert DNS for {slug}.3phaseflow.com.
 * GoDaddy gets the A or CNAME. Cloudflare gets the same name as DNS only
 * (grey cloud) when CLOUDFLARE_API_TOKEN is set. Shop hosts stay off the proxy.
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

const target = recordType === "A" ? ip : hostTarget.replace(/\.$/, "");
console.log(`OK: ${slug}.${domain} ${recordType} → ${target} (GoDaddy)`);

await upsertCloudflare({ domain, slug, recordType, content: target });

async function upsertCloudflare({ domain, slug, recordType, content }) {
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  if (!token) {
    console.warn("CLOUDFLARE_API_TOKEN not set. Cloudflare DNS was not updated.");
    return;
  }
  if (!content) {
    console.error("Cloudflare record content is empty");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const zoneRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`,
    { headers }
  );
  const zoneBody = await zoneRes.json();
  const zone = zoneBody.result && zoneBody.result[0];
  if (!zoneBody.success || !zone) {
    console.error("Cloudflare zone lookup failed", JSON.stringify(zoneBody.errors || []));
    process.exit(1);
  }

  const name = `${slug}.${domain}`;
  const listUrl =
    `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records` +
    `?type=${encodeURIComponent(recordType)}&name=${encodeURIComponent(name)}`;
  const listRes = await fetch(listUrl, { headers });
  const listBody = await listRes.json();
  if (!listBody.success) {
    console.error("Cloudflare list failed", JSON.stringify(listBody.errors || []));
    process.exit(1);
  }

  const existing = listBody.result && listBody.result[0];
  const payload = {
    type: recordType,
    name,
    content,
    ttl: 1,
    proxied: false,
  };
  const writeUrl = existing
    ? `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records/${existing.id}`
    : `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`;
  const writeRes = await fetch(writeUrl, {
    method: existing ? "PUT" : "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const writeBody = await writeRes.json();
  if (!writeBody.success) {
    console.error("Cloudflare error", JSON.stringify(writeBody.errors || []));
    process.exit(1);
  }
  console.log(`OK: ${name} ${recordType} → ${content} (Cloudflare, DNS only)`);
}
