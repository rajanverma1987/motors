#!/usr/bin/env node
/**
 * Copy one shop's users + CRM docs from shared Mongo into 3pf_{slug}.
 * Preserves passwordHash so login keeps working on the client host.
 *
 * node scripts/migrate-shop-data.mjs --slug cemotor --owner-email cemotorrepair@gmail.com
 * node scripts/migrate-shop-data.mjs --slug cemotor --owner-email ... --disable-source-login
 * node scripts/migrate-shop-data.mjs --slug cemotor --owner-email ... --disable-source-login-only
 * node scripts/migrate-shop-data.mjs ... --dry-run
 */
import { config } from "dotenv";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { devRoot, repoRoot } from "./_paths.mjs";

const root = repoRoot;
const appRoot = devRoot;
config({ path: join(root, ".env") });

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const slug = String(arg("slug")).trim().toLowerCase();
const ownerEmail = String(arg("owner-email")).trim().toLowerCase();
const sourceUri = arg("source-uri", process.env.SHARED_MONGODB_URI || process.env.MONGODB_URI || "");
const dryRun = hasFlag("dry-run");
const disableLogin = hasFlag("disable-source-login") || hasFlag("disable-source-login-only");
const disableOnly = hasFlag("disable-source-login-only");

if (!slug || !ownerEmail || !sourceUri) {
  console.error("Required: --slug --owner-email and MONGODB_URI/SHARED_MONGODB_URI");
  process.exit(1);
}

const mongoDbName = `3pf_${slug.replace(/-/g, "_")}`;

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

/** Collections keyed by ownerEmail or createdByEmail (shop-scoped). */
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
  { name: "inventoryreservations", filter: (email) => ({ createdByEmail: email }) },
  { name: "simpleexpenses", filter: (email) => ({ createdByEmail: email }) },
  { name: "simplepurchaseorders", filter: (email) => ({ createdByEmail: email }) },
  { name: "simpleserviceproposals", filter: (email) => ({ createdByEmail: email }) },
  { name: "activitylogs", filter: (email) => ({ ownerEmail: email }) },
  { name: "timeclockpunches", filter: (email) => ({ createdByEmail: email }) },
  { name: "timeclockmanualhours", filter: (email) => ({ createdByEmail: email }) },
  { name: "timeclockchallenges", filter: (email) => ({ createdByEmail: email }) },
  { name: "employeepayrollpayments", filter: (email) => ({ createdByEmail: email }) },
  { name: "othertaxpayments", filter: (email) => ({ createdByEmail: email }) },
  { name: "salescommissions", filter: (email) => ({ createdByEmail: email }) },
  { name: "salesperson", filter: (email) => ({ createdByEmail: email }) },
  { name: "ledgerentries", filter: (email) => ({ createdByEmail: email }) },
  { name: "logisticsentries", filter: (email) => ({ createdByEmail: email }) },
  { name: "diagramtemplates", filter: (email) => ({ createdByEmail: email }) },
  { name: "motorrepairjobs", filter: (email) => ({ createdByEmail: email }) },
  { name: "motorrepairinspections", filter: (email) => ({ createdByEmail: email }) },
  { name: "motorrepairflowquotes", filter: (email) => ({ createdByEmail: email }) },
  { name: "jobpostings", filter: (email) => ({ ownerEmail: email }) },
  { name: "jobapplications", filter: (email) => ({ ownerEmail: email }) },
  { name: "shopsubscriptions", filter: (email) => ({ ownerEmail: email }) },
  { name: "quickbooksconnections", filter: (email) => ({ ownerEmail: email }) },
  { name: "quickbookssynclogs", filter: (email) => ({ ownerEmail: email }) },
  { name: "integrationapikeys", filter: (email) => ({ ownerEmail: email }) },
  { name: "integrationwebhooks", filter: (email) => ({ ownerEmail: email }) },
  { name: "securityauditlogs", filter: (email) => ({ ownerEmail: email }) },
];

async function disableSourceLogin(srcDb) {
  const r = await srcDb.collection("users").updateOne(
    { email: ownerEmail },
    { $set: { canLogin: false, migratedToSlug: slug } }
  );
  console.log("disable-source-login:", r.modifiedCount ? "updated" : "no change", ownerEmail);
}

const destUri = withDbName(sourceUri, mongoDbName);
console.log({ slug, ownerEmail, mongoDbName, dryRun, disableLogin, disableOnly });

const srcConn = await mongoose.createConnection(sourceUri).asPromise();
const dstConn = disableOnly ? null : await mongoose.createConnection(destUri).asPromise();
const srcDb = srcConn.db;

if (disableOnly) {
  if (!dryRun) await disableSourceLogin(srcDb);
  else console.log("[dry-run] would disable source login");
  await srcConn.close();
  process.exit(0);
}

const report = [];
for (const { name, filter } of EMAIL_FILTERS) {
  const col = srcDb.collection(name);
  let exists = true;
  try {
    await col.findOne(filter(ownerEmail));
  } catch {
    exists = false;
  }
  if (!exists) continue;
  const docs = await col.find(filter(ownerEmail)).toArray();
  report.push({ collection: name, count: docs.length });
  if (dryRun || docs.length === 0) continue;
  const destCol = dstConn.db.collection(name);
  for (const doc of docs) {
    const { _id, ...rest } = doc;
    await destCol.updateOne({ _id }, { $set: { ...rest, _id } }, { upsert: true });
  }
}

console.table(report);

if (!dryRun) {
  const user = await dstConn.db.collection("users").findOne({ email: ownerEmail });
  if (!user?.passwordHash) {
    console.warn("WARNING: destination user missing or no passwordHash");
  } else {
    console.log("OK: user migrated with passwordHash length", user.passwordHash.length);
  }
}

if (disableLogin && !dryRun) {
  await disableSourceLogin(srcDb);
}

await srcConn.close();
if (dstConn) await dstConn.close();
console.log(dryRun ? "Dry run complete" : "Migrate complete");
console.log(`
Checklist before disabling shared dashboards for this shop:
[ ] Login on https://${slug}.3phaseflow.com/login with same password
[ ] Collection counts spot-check (table above)
[ ] Open 5 sample attachments after migrate-shop-uploads
[ ] Create a test job on cemotor
[ ] SMTP settings present or send blocked correctly
[ ] Subscription entitlement call OK
[ ] Lead webhook test OK
`);
