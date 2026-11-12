/**
 * Windows server: pull, build, and restart one or more PM2 apps.
 *
 * Usage (on the server):
 *   node dev\scripts\pm2-pull-build.js 12
 *   node dev\scripts\pm2-pull-build.js cemotor demo
 *   node dev\scripts\pm2-pull-build.js 12,15 "3pf*"
 *
 * A * in a name matches any text. 3pf* restarts every app whose name starts with 3pf.
 * Quote the pattern in PowerShell or cmd so the shell does not expand it.
 * Apps that share one folder are pulled and built once, then each process is restarted.
 *
 * Reads each app folder from D:\node\pm2\ecosystem.config.js (override with --config).
 * Prompts once for the git SSH password. Leave it blank to use the existing SSH key.
 * The password is not stored. You can also set GIT_SSH_PASSWORD for that command only.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");

const DEFAULT_CONFIG = "D:\\node\\pm2\\ecosystem.config.js";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { targets: [], config: DEFAULT_CONFIG };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--config") {
      out.config = args[i + 1] || "";
      i += 1;
      continue;
    }
    for (const part of arg.split(",")) {
      const target = part.trim();
      if (target) out.targets.push(target);
    }
  }
  return out;
}

function wildcardToRegExp(pattern) {
  const body = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${body}$`);
}

function targetMatches(target, proc) {
  const id = String(proc.pm_id);
  const name = String(proc.name || "");
  if (/^\d+$/.test(target) && id === target) return true;
  if (name === target) return true;
  if (target.includes("*") || target.includes("?")) return wildcardToRegExp(target).test(name);
  return false;
}

function loadEcosystem(filePath) {
  let resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) && fs.existsSync(`${resolved}.js`)) resolved = `${resolved}.js`;
  if (!fs.existsSync(resolved)) fail(`Ecosystem file not found: ${resolved}`);
  const source = fs.readFileSync(resolved, "utf8");
  const compiled = new Module(resolved);
  compiled.filename = resolved.endsWith(".js") ? resolved : `${resolved}.js`;
  compiled.paths = Module._nodeModulePaths(path.dirname(resolved));
  compiled._compile(source, compiled.filename);
  const exported = compiled.exports || {};
  const apps = Array.isArray(exported.apps) ? exported.apps : Array.isArray(exported) ? exported : [];
  if (!apps.length) fail(`No apps found in ${resolved}`);
  return apps;
}

function appCwd(app) {
  const cwd = String(app.cwd || app.pm_cwd || "").trim();
  if (cwd) return path.resolve(cwd);
  const script = String(app.script || "").trim();
  if (script && path.isAbsolute(script)) return path.dirname(script);
  return "";
}

function run(command, args, { cwd, env, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env || process.env,
      shell: process.platform === "win32",
      windowsHide: true,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function pm2List() {
  const { stdout } = await run("pm2", ["jlist"], { capture: true });
  const start = stdout.indexOf("[");
  if (start < 0) fail("pm2 jlist did not return a process list.");
  const list = JSON.parse(stdout.slice(start));
  return Array.isArray(list) ? list : [];
}

function promptHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      let value = "";
      process.stdin.setEncoding("utf8");
      process.stdin.resume();
      process.stdin.once("data", (chunk) => {
        value = String(chunk || "").replace(/\r?\n$/, "");
        process.stdin.pause();
        resolve(value);
      });
      return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (ch === "\u0003") {
        process.stdout.write("\n");
        process.exit(1);
      }
      if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += ch;
    };
    process.stdin.on("data", onData);
  });
}

function writeAskpass(dir) {
  const scriptPath = path.join(dir, "askpass.cjs");
  const cmdPath = path.join(dir, "askpass.cmd");
  fs.writeFileSync(
    scriptPath,
    [
      "const fs = require('fs');",
      "const file = process.env.PM2_DEPLOY_PW_FILE;",
      "if (!file) process.exit(1);",
      "process.stdout.write(fs.readFileSync(file, 'utf8'));",
      "",
    ].join("\n")
  );
  fs.writeFileSync(cmdPath, `@echo off\r\n"${process.execPath}" "${scriptPath}"\r\n`);
  return cmdPath;
}

async function gitPull(cwd, password) {
  if (!password) {
    await run("git", ["pull", "--ff-only"], { cwd });
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm2-deploy-"));
  const pwFile = path.join(dir, "pw.txt");
  fs.writeFileSync(pwFile, password, { encoding: "utf8", mode: 0o600 });
  const askpass = writeAskpass(dir);
  const env = {
    ...process.env,
    PM2_DEPLOY_PW_FILE: pwFile,
    SSH_ASKPASS: askpass,
    SSH_ASKPASS_REQUIRE: "force",
    GIT_ASKPASS: askpass,
    GIT_TERMINAL_PROMPT: "0",
    DISPLAY: "1",
  };
  try {
    await run("git", ["pull", "--ff-only"], { cwd, env });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const { targets, config } = parseArgs(process.argv);
  if (!targets.length) {
    fail('Usage: node dev\\scripts\\pm2-pull-build.js <pm2-id-or-name> [more...] [--config D:\\node\\pm2\\ecosystem.config.js]\nExample: node dev\\scripts\\pm2-pull-build.js 12 "3pf*"');
  }
  for (const target of targets) {
    if (!/^[\w.*?-]+$/.test(target)) fail(`Unsupported characters in "${target}".`);
  }

  const processes = await pm2List();
  const matched = [];
  const seen = new Set();
  for (const proc of processes) {
    if (!targets.some((target) => targetMatches(target, proc))) continue;
    const id = String(proc.pm_id);
    if (seen.has(id)) continue;
    seen.add(id);
    matched.push(proc);
  }
  if (!matched.length) {
    const known = processes.map((row) => `${row.pm_id} ${row.name}`).join("\n");
    fail(`No PM2 process matched: ${targets.join(", ")}\n${known}`);
  }

  const apps = loadEcosystem(config);
  const selected = matched.map((proc) => {
    const name = String(proc.name || "");
    const app = apps.find((row) => String(row.name || "") === name);
    if (!app) {
      const known = apps.map((row) => row.name).filter(Boolean).join(", ");
      fail(`No app named "${name}" in ${config}. Apps: ${known}`);
    }
    const cwd = appCwd(app);
    if (!cwd || !fs.existsSync(cwd)) fail(`App folder from ecosystem config does not exist for ${name}: ${cwd || "(empty)"}`);
    return { id: String(proc.pm_id), name, cwd };
  });
  selected.sort((a, b) => a.name.localeCompare(b.name) || Number(a.id) - Number(b.id));

  const groups = new Map();
  for (const item of selected) {
    const key = item.cwd.toLowerCase();
    if (!groups.has(key)) groups.set(key, { cwd: item.cwd, procs: [] });
    groups.get(key).procs.push(item);
  }

  console.log(`Matched ${selected.length} process${selected.length === 1 ? "" : "es"}:`);
  for (const item of selected) console.log(`  ${item.id}  ${item.name}  ${item.cwd}`);

  const fromEnv = process.env.GIT_SSH_PASSWORD;
  const password =
    fromEnv != null && fromEnv !== ""
      ? fromEnv
      : await promptHidden("Git SSH password (Enter to use the current key): ");
  if (!password) console.log("No SSH password entered. Using the current SSH key.");

  for (const group of groups.values()) {
    const names = group.procs.map((item) => item.name).join(", ");
    console.log(`\n${names}`);
    console.log(`Folder ${group.cwd}`);
    console.log("git pull");
    await gitPull(group.cwd, password);
    console.log("npm run build");
    await run("npm", ["run", "build"], { cwd: group.cwd });
    for (const item of group.procs) {
      console.log(`pm2 restart ${item.id} ${item.name}`);
      await run("pm2", ["restart", item.id]);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
