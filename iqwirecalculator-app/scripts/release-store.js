#!/usr/bin/env node
/**
 * Bump ios.buildNumber + android.versionCode in app.config.js, then
 * EAS production build + submit. EAS autoIncrement cannot edit app.config.js.
 *
 *   npm run release:store
 *   npm run release:store -- android
 *   npm run release:store -- all
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const configPath = path.join(root, "app.config.js");
const platformArg = String(process.argv[2] || "ios").toLowerCase();
const platform = ["ios", "android", "all"].includes(platformArg) ? platformArg : "ios";

function bumpBuildNumbers() {
  let src = fs.readFileSync(configPath, "utf8");
  const match = src.match(/buildNumber:\s*"(\d+)"/);
  if (!match) {
    console.error("Could not find ios.buildNumber in app.config.js");
    process.exit(1);
  }
  const next = String(Number(match[1]) + 1);
  if (!/versionCode:\s*\d+/.test(src)) {
    console.error("Could not find android.versionCode in app.config.js");
    process.exit(1);
  }
  src = src.replace(/buildNumber:\s*"\d+"/, `buildNumber: "${next}"`);
  src = src.replace(/versionCode:\s*\d+/, `versionCode: ${next}`);
  fs.writeFileSync(configPath, src);
  console.log(`Bumped iOS buildNumber and Android versionCode to ${next}`);
  return next;
}

function run(args) {
  const isWin = process.platform === "win32";
  const result = spawnSync(isWin ? "npx.cmd" : "npx", ["eas-cli", ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  const code = result.status ?? 1;
  if (code !== 0) process.exit(code);
}

bumpBuildNumbers();
run(["build", "--platform", platform, "--profile", "production"]);
run(["submit", "--platform", platform, "--latest", "--profile", "production"]);
