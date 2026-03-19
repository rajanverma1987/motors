#!/usr/bin/env node
/**
 * eas update evaluates app.config.js on THIS machine. If .env has localhost,
 * the OTA bundle will bake that in and phones cannot sign in.
 * This script sets EXPO_PUBLIC_API_URL from eas.json → build.production.env
 * before running `eas update`.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const easPath = path.join(root, "eas.json");
const eas = JSON.parse(fs.readFileSync(easPath, "utf8"));
const url = eas?.build?.production?.env?.EXPO_PUBLIC_API_URL;

if (!url || typeof url !== "string") {
  console.error(
    "Missing eas.json → build.production.env.EXPO_PUBLIC_API_URL (production CRM base URL)."
  );
  process.exit(1);
}

const trimmed = url.trim().replace(/\/+$/, "");
process.env.EXPO_PUBLIC_API_URL = trimmed;
console.log("EXPO_PUBLIC_API_URL for this OTA:", trimmed);

const extraArgs = process.argv.slice(2);
const isWin = process.platform === "win32";
const result = spawnSync(isWin ? "npx.cmd" : "npx", ["eas", "update", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, EXPO_PUBLIC_API_URL: trimmed },
  shell: false,
});

process.exit(result.status ?? 1);
