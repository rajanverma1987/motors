/**
 * Copy status lists and settings dropdowns from a template shop database
 * into a new client shop database. Does not copy SMTP, logo, addresses, or tokens.
 */
import { existsSync, readFileSync } from "fs";
import mongoose from "mongoose";
import { withDbName } from "./client-slug.mjs";

const CATALOG_KEYS = [
  "controlledDropdowns",
  "productDropdowns",
  "workOrderStatuses",
  "shopFloorBoardOrder",
  "workOrderClosedStatuses",
  "workOrderStatusTileColors",
  "inventoryLocations",
  "quickBooksJobClosedStatuses",
];

function envFileValue(filePath, key) {
  if (!filePath || !existsSync(filePath)) return "";
  const match = readFileSync(filePath, "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return String(match?.[1] || "").trim();
}

function catalogSlice(settings) {
  const src = settings && typeof settings === "object" ? settings : {};
  const out = {};
  for (const key of CATALOG_KEYS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return JSON.parse(JSON.stringify(out));
}

function catalogSummary(settings) {
  const cd = settings.controlledDropdowns && typeof settings.controlledDropdowns === "object"
    ? settings.controlledDropdowns
    : {};
  const pd = settings.productDropdowns && typeof settings.productDropdowns === "object"
    ? settings.productDropdowns
    : {};
  const entryCount = (key) => (Array.isArray(cd[key]?.entries) ? cd[key].entries.length : 0);
  const optionCount = Object.values(pd).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  return {
    quoteStatuses: entryCount("quote_status"),
    workOrderStatuses: entryCount("work_order_status") || (Array.isArray(settings.workOrderStatuses) ? settings.workOrderStatuses.length : 0),
    invoiceStatuses: entryCount("invoice_status"),
    productOptions: optionCount,
  };
}

/**
 * @param {{
 *   baseUri: string,
 *   templateSlug: string,
 *   templateEnvPath?: string,
 *   destDbName: string,
 *   destOwnerEmail: string,
 * }} opts
 */
export async function seedShopCatalogSettings({
  baseUri,
  templateSlug,
  templateEnvPath = "",
  destDbName,
  destOwnerEmail,
}) {
  const ownerEmail = String(destOwnerEmail || "").trim().toLowerCase();
  if (!ownerEmail) {
    console.warn("No --email. Statuses and dropdowns were not copied. Pass --email so they attach to that login.");
    return { skipped: true };
  }
  if (!baseUri || !templateSlug || !destDbName) {
    throw new Error("Cannot copy statuses and dropdowns: missing database connection details.");
  }

  const sourceDbName = `3pf_${String(templateSlug).replace(/-/g, "_")}`;
  const sourceEmail = envFileValue(templateEnvPath, "TENANT_OWNER_EMAIL").toLowerCase();
  const src = await mongoose.createConnection(withDbName(baseUri, sourceDbName)).asPromise();
  const dst = await mongoose.createConnection(withDbName(baseUri, destDbName)).asPromise();
  try {
    let doc = sourceEmail
      ? await src.db.collection("usersettings").findOne({ ownerEmail: sourceEmail })
      : null;
    if (!doc) doc = await src.db.collection("usersettings").findOne({ "settings.controlledDropdowns": { $exists: true } });
    if (!doc) doc = await src.db.collection("usersettings").findOne({});
    const settings = catalogSlice(doc?.settings);
    if (!Object.keys(settings).length) {
      console.warn(`No statuses or dropdowns found in ${sourceDbName}. New shop will use built-in defaults.`);
      return { skipped: true };
    }

    const set = { ownerEmail, updatedAt: new Date() };
    for (const [key, value] of Object.entries(settings)) {
      set[`settings.${key}`] = value;
    }
    await dst.db.collection("usersettings").updateOne(
      { ownerEmail },
      { $set: set, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    const summary = catalogSummary(settings);
    console.log(
      `Copied settings catalog into ${destDbName} for ${ownerEmail}: ${summary.quoteStatuses} quote statuses, ${summary.workOrderStatuses} work order statuses, ${summary.invoiceStatuses} invoice statuses, ${summary.productOptions} dropdown options.`
    );
    return { skipped: false, summary };
  } finally {
    await src.close();
    await dst.close();
  }
}
