#!/usr/bin/env node
/**
 * One-time bootstrap: extract apps/marketing, apps/admin, clients/cemotor
 * from the evaluator monolith under dev/ (zero shared packages between clients).
 */
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { devRoot, repoRoot } from "./_paths.mjs";

const EXCLUDE_TOP = new Set([
  "node_modules",
  ".git",
  ".next",
  "apps",
  "clients",
  "shop_uploads",
  "documents",
  ".cursor",
  "agent-transcripts",
  "scripts",
  "vendor",
  ".github",
]);
const EXCLUDE_FILES = new Set([
  "CleintRequirement.md",
  "DemoPoints.md",
  "Requirements.md",
  "seo.md",
  "PRODUCTION.md",
  "AGENTS.md",
  "README.md",
  "3phaseflowlogo.png",
  "app_fav.png",
  ".DS_Store",
  ".env",
  ".env.local",
  "package-lock.json",
]);

function shouldSkip(name) {
  if (EXCLUDE_TOP.has(name)) return true;
  if (EXCLUDE_FILES.has(name)) return true;
  if (name === "uploads") return true;
  return false;
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (shouldSkip(name)) continue;
    const from = join(src, name);
    const to = join(dest, name);
    const st = statSync(from);
    if (st.isDirectory()) {
      if (name === "uploads" && from.includes("public")) {
        mkdirSync(to, { recursive: true });
        writeFileSync(join(to, ".gitkeep"), "");
        continue;
      }
      copyTree(from, to);
    } else {
      cpSync(from, to);
    }
  }
}

function rmPath(p) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function patchPackageJson(appDir, name, startPort) {
  const pkgPath = join(appDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  pkg.private = true;
  pkg.scripts = {
    ...pkg.scripts,
    dev: `next dev --hostname 0.0.0.0 -p ${startPort}`,
    start: `next start -p ${startPort}`,
  };
  if (pkg.devDependencies?.braces) {
    pkg.devDependencies.braces = "file:../../dev/vendor/braces";
  }
  if (pkg.dependencies?.braces) {
    pkg.dependencies.braces = "file:../../dev/vendor/braces";
  }
  writeJson(pkgPath, pkg);
}

function stripForMarketing(appDir) {
  const srcApp = join(appDir, "src", "app");
  rmPath(join(srcApp, "(dashboard)"));
  rmPath(join(srcApp, "admin"));
  rmPath(join(srcApp, "api", "dashboard"));
  rmPath(join(srcApp, "api", "admin"));
  rmPath(join(srcApp, "api", "tech"));
  rmPath(join(srcApp, "time-clock"));
}

function stripForAdmin(appDir) {
  const srcApp = join(appDir, "src", "app");
  rmPath(join(srcApp, "(dashboard)"));
  rmPath(join(srcApp, "(marketing)"));
  rmPath(join(srcApp, "Track"));
  rmPath(join(srcApp, "iqwire"));
  rmPath(join(srcApp, "time-clock"));
  rmPath(join(srcApp, "portal"));
  rmPath(join(srcApp, "quote"));
  rmPath(join(srcApp, "po"));
  rmPath(join(srcApp, "invoice"));
  rmPath(join(srcApp, "repair-flow"));
  rmPath(join(srcApp, "job-board"));
}

function stripForCemotor(appDir) {
  const srcApp = join(appDir, "src", "app");
  rmPath(join(srcApp, "(marketing)"));
  rmPath(join(srcApp, "admin"));
  rmPath(join(srcApp, "api", "admin"));
  rmPath(join(srcApp, "api", "marketing"));
  rmPath(join(srcApp, "api", "listings"));
  rmPath(join(srcApp, "api", "location-pages"));
  rmPath(join(srcApp, "api", "lead-nurture"));
  rmPath(join(srcApp, "Track"));
}

console.log("Bootstrapping multi-host apps from dev/ monolith…");

const targets = [
  { dir: join(repoRoot, "apps", "marketing"), name: "3pf-marketing", port: 5066, strip: stripForMarketing },
  { dir: join(repoRoot, "apps", "admin"), name: "3pf-admin", port: 5067, strip: stripForAdmin },
  { dir: join(repoRoot, "clients", "cemotor"), name: "3pf-cemotor", port: 5100, strip: stripForCemotor },
];

for (const t of targets) {
  console.log("→", t.dir);
  rmPath(t.dir);
  mkdirSync(dirname(t.dir), { recursive: true });
  copyTree(devRoot, t.dir);
  rmPath(join(t.dir, "apps"));
  rmPath(join(t.dir, "clients"));
  rmPath(join(t.dir, "shop_uploads"));
  rmPath(join(t.dir, "documents"));
  patchPackageJson(t.dir, t.name, t.port);
  t.strip(t.dir);
  writeFileSync(
    join(t.dir, ".env.example"),
    `# Copy from repo root .env and override:\n# MONGODB_URI=\n# NEXT_PUBLIC_SITE_URL=\n# APP_ROLE=${t.name}\n`
  );
}

mkdirSync(join(repoRoot, "shop_uploads", "cemotor"), { recursive: true });
writeFileSync(join(repoRoot, "shop_uploads", "cemotor", ".gitkeep"), "");
writeFileSync(join(repoRoot, "shop_uploads", ".gitkeep"), "");

console.log("Done.");
