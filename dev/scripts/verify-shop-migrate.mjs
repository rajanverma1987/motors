#!/usr/bin/env node
/**
 * Compare collection counts: shared DB (owner filter) vs 3pf_{slug}.
 *
 * node scripts/verify-shop-migrate.mjs --slug cemotor --owner-email cemotorrepair@gmail.com
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import { join } from "path";
import { repoRoot } from "./_paths.mjs";

config({ path: join(repoRoot, ".env") });

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function withDbName(uri, dbName) {
  try {
    const u = new URL(uri);
    u.pathname = `/${dbName}`;
    return u.toString();
  } catch {
    if (uri.includes("?")) {
      const [pre, q] = uri.split("?");
      const base = pre.replace(/\/[^/?]*$/, "");
      return `${base}/${dbName}?${q}`;
    }
    return `${uri.replace(/\/?$/, "")}/${dbName}`;
  }
}

const slug = String(arg("slug")).trim().toLowerCase();
const ownerEmail = String(arg("owner-email")).trim().toLowerCase();
const sourceUri = process.env.MONGODB_URI || "";
if (!slug || !ownerEmail || !sourceUri) {
  console.error("Required: --slug --owner-email and MONGODB_URI");
  process.exit(1);
}

const mongoDbName = `3pf_${slug.replace(/-/g, "_")}`;
const destUri = withDbName(sourceUri, mongoDbName);

const EMAIL_FILTERS = [
  { name: "users", filter: (email) => ({ email }) },
  { name: "usersettings", filter: (email) => ({ ownerEmail: email }) },
  { name: "customers", filter: (email) => ({ createdByEmail: email }) },
  { name: "motors", filter: (email) => ({ createdByEmail: email }) },
  { name: "quotes", filter: (email) => ({ createdByEmail: email }) },
  { name: "invoices", filter: (email) => ({ createdByEmail: email }) },
  { name: "purchaseorders", filter: (email) => ({ createdByEmail: email }) },
  { name: "workorders", filter: (email) => ({ createdByEmail: email }) },
  { name: "vendors", filter: (email) => ({ createdByEmail: email }) },
  { name: "employees", filter: (email) => ({ createdByEmail: email }) },
  { name: "inventoryitems", filter: (email) => ({ createdByEmail: email }) },
  { name: "inventorymovements", filter: (email) => ({ createdByEmail: email }) },
  { name: "simplepurchaseorders", filter: (email) => ({ createdByEmail: email }) },
  { name: "simpleserviceproposals", filter: (email) => ({ createdByEmail: email }) },
  { name: "activitylogs", filter: (email) => ({ ownerEmail: email }) },
  { name: "timeclockpunches", filter: (email) => ({ createdByEmail: email }) },
  { name: "timeclockmanualhours", filter: (email) => ({ createdByEmail: email }) },
  { name: "employeepayrollpayments", filter: (email) => ({ createdByEmail: email }) },
  { name: "salescommissions", filter: (email) => ({ createdByEmail: email }) },
  { name: "logisticsentries", filter: (email) => ({ createdByEmail: email }) },
  { name: "diagramtemplates", filter: (email) => ({ createdByEmail: email }) },
  { name: "motorrepairinspections", filter: (email) => ({ createdByEmail: email }) },
  { name: "shopsubscriptions", filter: (email) => ({ ownerEmail: email }) },
];

const src = await mongoose.createConnection(sourceUri).asPromise();
const dst = await mongoose.createConnection(destUri).asPromise();
const rows = [];
let mismatches = 0;

for (const { name, filter } of EMAIL_FILTERS) {
  let srcCount = 0;
  let dstCount = 0;
  try {
    srcCount = await src.db.collection(name).countDocuments(filter(ownerEmail));
  } catch {
    srcCount = -1;
  }
  try {
    dstCount = await dst.db.collection(name).countDocuments({});
  } catch {
    dstCount = -1;
  }
  const ok = srcCount === dstCount;
  if (!ok) mismatches += 1;
  rows.push({ collection: name, source: srcCount, dest: dstCount, match: ok ? "OK" : "DIFF" });
}

console.log({ slug, ownerEmail, mongoDbName });
console.table(rows);
console.log(mismatches ? `MISMATCHES: ${mismatches}` : "All compared collections match.");

await src.close();
await dst.close();
process.exit(mismatches ? 1 : 0);
