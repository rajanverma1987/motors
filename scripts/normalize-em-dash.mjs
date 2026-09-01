/**
 * Replace em dashes (—) and en-dash ranges (–) with standard English punctuation
 * in public / marketing-facing source files.
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const MARKETING_PATHS = [
  "src/app/(marketing)",
  "src/components/marketing",
  "src/components/seo",
  "src/lib/home-faqs.js",
  "src/lib/seo-usa-lead-copy.js",
  "src/lib/seo-usa-config.js",
  "src/lib/industry-pages.js",
  "src/lib/location-page-content.js",
  "src/lib/customer-facing-email-content.js",
  "src/lib/email.js",
  "src/app/layout.js",
  "src/app/manifest.js",
  "src/app/portal",
];

function listFiles() {
  const patterns = MARKETING_PATHS.map((p) => `"${p}"`).join(" ");
  const out = execSync(`rg -l '[—–]' ${patterns}`, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  return out
    .trim()
    .split("\n")
    .filter(Boolean);
}

const TITLE_KEY_RE = /^\s*(title|ogTitle|headline|name|absolute)\s*[:=]/i;
const METADATA_TITLE_RE = /(title|ogTitle|headline|name):\s*["'{]/i;

function normalizeLine(line) {
  if (!line.includes("—") && !line.includes("–")) return line;

  let out = line;

  if (TITLE_KEY_RE.test(line) || (METADATA_TITLE_RE.test(line) && line.includes("—"))) {
    out = out.replace(/—/g, "|");
  }

  // Sentence breaks after em dash
  out = out.replace(/ — (We'|We'll|We |Got |Contact |They |It |This |That )/g, ". $1");
  out = out.replace(/ — (you're|you're|you |your )/gi, (m, w) => `. ${w.charAt(0).toUpperCase() + w.slice(1)}`);

  // Introduce lists or explanations
  out = out.replace(/ — (pricing|features|onboarding|a permanently|a significantly)/gi, ": $1");
  out = out.replace(/anything — /gi, "anything: ");
  out = out.replace(/Limited — /g, "Limited: ");
  out = out.replace(/ — indexed /g, ", indexed ");
  out = out.replace(/ — reaching /g, ", reaching ");
  out = out.replace(/ — all /g, ", all ");
  out = out.replace(/ — instantly /g, ", instantly ");
  out = out.replace(/ — without /g, ", without ");
  out = out.replace(/ — built /g, ", built ");
  out = out.replace(/ — contact /gi, ". Contact ");
  out = out.replace(/ — equivalent /g, ", equivalent ");
  out = out.replace(/ — saving /g, ", saving ");
  out = out.replace(/ — work orders/g, ": work orders");
  out = out.replace(/ — intake /g, ": intake ");
  out = out.replace(/ — nothing /g, "; nothing ");
  out = out.replace(/ — guaranteed /g, ", guaranteed ");
  out = out.replace(/ — your rate /g, ". Your rate ");
  out = out.replace(/ — once /g, ". Once ");
  out = out.replace(/ — no matter /g, ", no matter ");
  out = out.replace(/ — coming soon/gi, ", coming soon");
  out = out.replace(/ — HP,/g, ": HP,");
  out = out.replace(/ — all in one/g, ", all in one");
  out = out.replace(/ — see the/g, ". See the");
  out = out.replace(/ — anything /g, ", anything ");
  out = out.replace(/ — we'll /gi, ". We'll ");
  out = out.replace(/ — we'll reply/gi, ". We'll reply");
  out = out.replace(/received — /gi, "received. ");
  out = out.replace(/question — /gi, "question. ");
  out = out.replace(/ — Free /g, ". Free ");
  out = out.replace(/ — one click/g, ", one click");
  out = out.replace(/ — not /g, ", not ");
  out = out.replace(/ — an industry/g, ", an industry");
  out = out.replace(/ — job cards/g, ", job cards");
  out = out.replace(/ — maintenance /g, ", maintenance ");
  out = out.replace(/ — published /g, ", published ");
  out = out.replace(/ — Governs /g, ". Governs ");
  out = out.replace(/ — Recommended /g, ", recommended ");
  out = out.replace(/ — which /g, ", which ");
  out = out.replace(/ — Motor /g, "| Motor ");
  out = out.replace(/ — Electric /g, "| Electric ");
  out = out.replace(/ — How /g, ": How ");
  out = out.replace(/ — Find /g, ": Find ");
  out = out.replace(/ — Shop /g, "| Shop ");
  out = out.replace(/ — Built /g, "| Built ");
  out = out.replace(/ — US /g, "| US ");
  out = out.replace(/ — Full /g, "| Full ");
  out = out.replace(/ — Ballpark/g, "| Ballpark");
  out = out.replace(/ — Get /g, "| Get ");
  out = out.replace(/ — Should /g, "| Should ");
  out = out.replace(/ — economics/g, ", economics");
  out = out.replace(/ — compare /g, ", compare ");
  out = out.replace(/ — rewind/g, ", rewind");
  out = out.replace(/ — when /g, ", when ");
  out = out.replace(/ — hub /g, ", hub ");
  out = out.replace(/ — local /g, ", local ");
  out = out.replace(/ — surplus /g, ", surplus ");
  out = out.replace(/ — shops /g, ", shops ");

  // En-dash numeric / money ranges
  out = out.replace(/(\$[\d,]+)–(\$?[\d,]+)/g, "$1 to $2");
  out = out.replace(/(\d[\d,]*)–(\d)/g, "$1 to $2");
  out = out.replace(/Fractional – /g, "Fractional to ");
  out = out.replace(/ – /g, " to ");

  // Remaining em dashes
  out = out.replace(/ — /g, ", ");
  out = out.replace(/—/g, ", ");

  return out;
}

function normalizeContent(content) {
  return content
    .split("\n")
    .map((line) => normalizeLine(line))
    .join("\n");
}

let changed = 0;
const files = listFiles();

for (const file of files) {
  const before = readFileSync(file, "utf8");
  if (!before.includes("—") && !before.includes("–")) continue;
  const after = normalizeContent(before);
  if (after !== before) {
    writeFileSync(file, after, "utf8");
    changed += 1;
    console.log(file);
  }
}

console.log(`Updated ${changed} file(s).`);
