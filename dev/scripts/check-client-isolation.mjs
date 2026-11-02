#!/usr/bin/env node
/**
 * Fail if any clients/{slug} source file imports outside its own tree
 * (relative paths escaping to apps/, other clients, or repo root src).
 */
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, relative, resolve } from "path";
import { devRoot, repoRoot } from "./_paths.mjs";

const root = repoRoot;
const clientsRoot = join(root, "clients");
if (!existsSync(clientsRoot)) {
  console.log("No clients/ yet — OK");
  process.exit(0);
}

const bad = [];

function walk(dir, slug) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, slug);
      continue;
    }
    if (!/\.(js|jsx|mjs|cjs|ts|tsx)$/.test(name)) continue;
    const text = readFileSync(full, "utf8");
    const importRe = /from\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;
    let m;
    while ((m = importRe.exec(text))) {
      const spec = m[1] || m[2];
      if (!spec.startsWith(".")) continue;
      const resolved = resolve(dir, spec);
      const clientRoot = join(clientsRoot, slug);
      const rel = relative(clientRoot, resolved);
      if (rel.startsWith("..")) {
        bad.push({ file: relative(root, full), import: spec });
      }
    }
  }
}

for (const slug of readdirSync(clientsRoot)) {
  const dir = join(clientsRoot, slug);
  if (!statSync(dir).isDirectory()) continue;
  walk(dir, slug);
}

if (bad.length) {
  console.error("Client isolation violations:");
  for (const b of bad) console.error(`  ${b.file} → ${b.import}`);
  process.exit(1);
}
console.log("Client isolation OK");
