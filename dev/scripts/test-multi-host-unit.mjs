#!/usr/bin/env node
/**
 * Unit tests for multi-host crypto + entitlement + isolation (no DB required).
 */
import assert from "assert";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { devRoot, repoRoot } from "./_paths.mjs";

const root = repoRoot;
const appRoot = devRoot;

// Dynamic imports from src
const crypto = await import(join(appRoot, "src/lib/platform-tenant-crypto.js"));
const ent = await import(join(appRoot, "src/lib/subscription-entitlement.js"));
const rbac = await import(join(appRoot, "src/lib/admin-rbac.js"));

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log("OK", name);
  } catch (e) {
    failed += 1;
    console.error("FAIL", name, e.message);
  }
}

check("sign/verify platform payload", () => {
  const secret = "test-secret";
  const { body, ts, jti, sig } = crypto.signPlatformPayload(secret, { email: "a@b.com", name: "A" });
  const v = crypto.verifyPlatformPayload(secret, { body, ts, jti, sig });
  assert.equal(v.ok, true);
  const bad = crypto.verifyPlatformPayload(secret, { body, ts, jti, sig: "nope" });
  assert.equal(bad.ok, false);
});

check("support handoff token", () => {
  const secret = "handoff-secret";
  const token = crypto.signSupportHandoff(secret, {
    slug: "cemotor",
    adminUserId: "owner@x.com",
    mode: "support",
    exp: Date.now() + 60_000,
    jti: "abc",
  });
  const payload = crypto.verifySupportHandoff(secret, token);
  assert.equal(payload.slug, "cemotor");
  assert.equal(payload.mode, "support");
  const expired = crypto.signSupportHandoff(secret, {
    slug: "cemotor",
    mode: "support",
    exp: Date.now() - 1000,
    jti: "x",
  });
  assert.equal(crypto.verifySupportHandoff(secret, expired), null);
});

check("entitlement grace then paywall", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const expiredAt = new Date("2026-11-05T12:00:00Z");
  const grace = ent.computeEntitlement({ status: "expired", expiresAt: expiredAt, now });
  assert.equal(grace.access, "grace");
  assert.equal(grace.grace, true);
  const later = new Date("2026-11-15T12:00:00Z");
  const paywall = ent.computeEntitlement({ status: "expired", expiresAt: expiredAt, now: later });
  assert.equal(paywall.paywall, true);
  const active = ent.computeEntitlement({ status: "active", now });
  assert.equal(active.access, "full");
});

check("admin RBAC", () => {
  assert.equal(rbac.adminCan("owner", "tenant.keys.rotate"), true);
  assert.equal(rbac.adminCan("admin", "tenant.keys.rotate"), false);
  assert.equal(rbac.adminCan("admin", "tenants.open_shop"), true);
});

check("client isolation script", () => {
  const r = spawnSync(process.execPath, [join(appRoot, "scripts/check-client-isolation.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

process.env.SHOP_UPLOADS_ROOT = "/tmp/shop_uploads_test_cemotor";
process.env.APP_ROLE = "client";
const uploadFs = await import(join(appRoot, "src/lib/public-upload-fs.js"));
check("getPublicUploadsRoot respects SHOP_UPLOADS_ROOT", () => {
  const rootPath = uploadFs.getPublicUploadsRoot();
  assert.ok(String(rootPath).includes("shop_uploads_test_cemotor"), rootPath);
});

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll multi-host unit tests passed");
