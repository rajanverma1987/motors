#!/usr/bin/env node
/**
 * Copy 3PF SMTP settings from repo root .env into clients/cemotor/.env
 * for portal password-reset emails (PLATFORM_SMTP_*).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { repoRoot } from "./_paths.mjs";

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

const root = parseEnv(readFileSync(join(repoRoot, ".env"), "utf8"));
const cemotorPath = join(repoRoot, "clients/cemotor/.env");
let text = readFileSync(cemotorPath, "utf8");

const smtpUser = root.PLATFORM_SMTP_USER || root.SMTP_USER || "";
const smtpPass = root.PLATFORM_SMTP_PASS || root.SMTP_PASS || "";
const emailFrom = root.EMAIL_FROM || (smtpUser ? `"3PhaseFlow <${smtpUser.replace(/^["']|["']$/g, "")}>"` : "");

if (!smtpUser || !smtpPass) {
  console.error("Root .env missing SMTP_USER / SMTP_PASS");
  process.exit(1);
}

text = upsert(text, "PLATFORM_SMTP_USER", smtpUser);
text = upsert(text, "PLATFORM_SMTP_PASS", smtpPass);
if (emailFrom) text = upsert(text, "EMAIL_FROM", emailFrom);

writeFileSync(cemotorPath, text.endsWith("\n") ? text : `${text}\n`);
console.log("Synced PLATFORM_SMTP_* (+ EMAIL_FROM) into clients/cemotor/.env");
