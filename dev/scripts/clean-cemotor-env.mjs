#!/usr/bin/env node
/**
 * Strip clients/cemotor/.env down to shop-client variables only.
 * Preserves MONGODB_URI (3pf_cemotor) and JWT_SECRET from the current file.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { repoRoot } from "./_paths.mjs";

const envPath = join(repoRoot, "clients/cemotor/.env");
const raw = readFileSync(envPath, "utf8");
const cur = {};
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) cur[m[1]] = m[2];
}

function dbName(uri) {
  try {
    return new URL(uri.replace(/^["']|["']$/g, "")).pathname.replace(/^\//, "") || "(default)";
  } catch {
    return "?";
  }
}

const mongoUri = cur.MONGODB_URI || "";
const jwt = cur.JWT_SECRET || cur.PORTAL_JWT_SECRET || "";
if (!mongoUri) {
  console.error("Missing MONGODB_URI in current .env");
  process.exit(1);
}
if (!jwt || String(jwt).replace(/^["']|["']$/g, "").length < 16) {
  console.error("Missing JWT_SECRET (need >= 16 chars for portal sessions)");
  process.exit(1);
}

const uploadsRoot = (cur.SHOP_UPLOADS_ROOT || "").trim() || join(repoRoot, "shop_uploads", "cemotor");

const lines = [
  "# cemotor shop client only (no platform / marketing / DNS secrets)",
  "APP_ROLE=client",
  "TENANT_SLUG=cemotor",
  "TENANT_HOST=cemotor.3phaseflow.com",
  "TENANT_OWNER_EMAIL=cemotorrepair@gmail.com",
  "",
  `MONGODB_URI=${mongoUri}`,
  "NEXT_PUBLIC_SITE_URL=http://localhost:5100",
  `SHOP_UPLOADS_ROOT=${uploadsRoot}`,
  "",
  "FORCE_SHOP_SMTP_ONLY=1",
  "ALLOWED_HOSTS=cemotor.3phaseflow.com,localhost,127.0.0.1",
  "",
  "# Portal session signing",
  `JWT_SECRET=${jwt}`,
  "",
  "# Platform admin bridge (optional until admin host is live)",
  "PLATFORM_API_BASE=https://admin.3phaseflow.com",
  `PLATFORM_TENANT_KEY=${cur.PLATFORM_TENANT_KEY || ""}`,
  `SUPPORT_HANDOFF_SECRET=${cur.SUPPORT_HANDOFF_SECRET || ""}`,
  `PLATFORM_WEBHOOK_SECRET=${cur.PLATFORM_WEBHOOK_SECRET || cur.SUPPORT_HANDOFF_SECRET || ""}`,
  "",
];

writeFileSync(envPath, lines.join("\n"));
console.log("Wrote", envPath);
console.log({
  db: dbName(mongoUri),
  keyCount: lines.filter((l) => l.includes("=")).length,
  keys: lines.filter((l) => l.includes("=")).map((l) => l.split("=")[0]),
});

const localPath = join(repoRoot, "clients/cemotor/.env.local");
if (existsSync(localPath)) {
  writeFileSync(localPath, "# Local overrides for cemotor (optional)\n");
  console.log("Cleared marketing leftovers in .env.local");
}
