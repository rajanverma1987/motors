/**
 * 1. Generates public/sitemap.xml with all marketing pages.
 * 2. Prompts for a git commit message.
 * 3. Runs git add -A, git commit -m "<message>", git push.
 */
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const readline = require("readline");

const root = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: opts.silent ? "pipe" : "inherit", encoding: "utf8", ...opts });
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      const trimmed = (answer || "").trim();
      rl.close();
      // Readline can leave stdin open so the Node process never exits; shell looks “stuck”.
      if (typeof process.stdin.pause === "function") process.stdin.pause();
      resolve(trimmed);
    });
  });
}

async function main() {
  console.log("Generating public/sitemap.xml (same URLs as src/app/sitemap.js, incl. USA city pages)...\n");
  run("node scripts/generate-sitemap.js", { silent: false });

  const message = await prompt("Commit message: ");
  if (!message) {
    console.error("No message provided. Exiting.");
    process.exit(1);
  }

  run("git add -A");
  const commit = spawnSync("git", ["commit", "-m", message], { cwd: root, stdio: "inherit" });
  if (commit.status !== 0) process.exit(commit.status || 1);
  run("git push");
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
