/**
 * Convert Simple portal calendar fields from locale/ISO strings to BSON Date (UTC noon).
 *
 * Usage (from repo root):
 *   node scripts/backfill-simple-portal-dates.js
 *   node scripts/backfill-simple-portal-dates.js --dry-run
 *   node scripts/backfill-simple-portal-dates.js --locale=en-US
 *   npm run backfill:simple-portal-dates
 *
 * Requires MONGODB_URI in .env or .env.local
 *
 * Ambiguous slash dates (e.g. 6/11/2026) are parsed with --locale (default en-US = MDY).
 */

const path = require("path");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const localeArg = process.argv.find((a) => a.startsWith("--locale="));
const locale = localeArg ? localeArg.slice("--locale=".length) : "en-US";

require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

const SP_FIELDS = [
  "dateCreated",
  "date",
  "dueDate",
  "proposalSubmitDate",
  "proposalAcceptedDate",
  "invoiceSubmitDate",
  "invoicePaidDate",
  "submitDate",
  "acceptDate",
];

const PO_FIELDS = [
  "poCutDate",
  "dueDate",
  "date",
  "poInvoiceReceiveDate",
  "poItemReceiveDate",
  "poPaidDate",
];

function needsConvert(value) {
  if (value == null || value === "") return "clear";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Already Date — normalize to UTC noon if not already
    if (value.getUTCHours() === 12 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0) {
      return false;
    }
    return "normalize";
  }
  if (typeof value === "string" || typeof value === "number") return "string";
  return false;
}

async function migrateCollection(Model, fields, label, toMongoCalendarDate) {
  const cursor = Model.find({}).cursor();
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for await (const doc of cursor) {
    scanned += 1;
    /** @type {Record<string, unknown>} */
    const $set = {};
    let dirty = false;

    for (const key of fields) {
      if (!Object.prototype.hasOwnProperty.call(doc.toObject?.() || doc, key) && doc[key] === undefined) {
        continue;
      }
      const raw = doc[key];
      const kind = needsConvert(raw);
      if (!kind) continue;
      if (kind === "clear") {
        if (raw === "") {
          $set[key] = null;
          dirty = true;
        }
        continue;
      }
      const next = toMongoCalendarDate(raw, { locale });
      if (next == null && raw !== "" && raw != null) {
        console.warn(`[${label}] ${doc._id} ${key}=${JSON.stringify(raw)} unparseable — left unchanged`);
        continue;
      }
      if (
        !(raw instanceof Date) ||
        raw.getTime() !== next?.getTime() ||
        kind === "normalize"
      ) {
        $set[key] = next;
        dirty = true;
      }
    }

    if (Array.isArray(doc.payments)) {
      let payDirty = false;
      const payments = doc.payments.map((p) => {
        if (!p || typeof p !== "object") return p;
        const kind = needsConvert(p.date);
        if (!kind) return p;
        payDirty = true;
        if (kind === "clear") return { ...(typeof p.toObject === "function" ? p.toObject() : p), date: null };
        return {
          ...(typeof p.toObject === "function" ? p.toObject() : p),
          date: toMongoCalendarDate(p.date, { locale }),
        };
      });
      if (payDirty) {
        $set.payments = payments;
        dirty = true;
      }
    }

    if (Array.isArray(doc.lineItems)) {
      let lineDirty = false;
      const lineItems = doc.lineItems.map((line) => {
        if (!line || typeof line !== "object") return line;
        const kind = needsConvert(line.receivedDate);
        if (!kind) return line;
        lineDirty = true;
        if (kind === "clear") {
          return {
            ...(typeof line.toObject === "function" ? line.toObject() : line),
            receivedDate: null,
          };
        }
        return {
          ...(typeof line.toObject === "function" ? line.toObject() : line),
          receivedDate: toMongoCalendarDate(line.receivedDate, { locale }),
        };
      });
      if (lineDirty) {
        $set.lineItems = lineItems;
        dirty = true;
      }
    }

    // Keep SP date alias in sync when dateCreated is set
    if (label === "SimpleServiceProposal" && Object.prototype.hasOwnProperty.call($set, "dateCreated")) {
      $set.date = $set.dateCreated;
    }

    if (!dirty) {
      skipped += 1;
      continue;
    }

    updated += 1;
    if (dryRun) {
      if (updated <= 5) {
        console.log(`[dry-run] ${label} ${doc._id}`, $set);
      }
      continue;
    }

    await Model.updateOne({ _id: doc._id }, { $set });
  }

  return { scanned, updated, skipped };
}

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: { "@": path.join(root, "src") },
  });

  const { connectDB } = jiti(path.join(root, "src/lib/db.js"));
  const { toMongoCalendarDate } = jiti(path.join(root, "src/lib/format-date.js"));
  const SimpleServiceProposal = jiti(path.join(root, "src/models/SimpleServiceProposal.js")).default;
  const SimplePurchaseOrder = jiti(path.join(root, "src/models/SimplePurchaseOrder.js")).default;

  await connectDB();
  console.log(`Locale for ambiguous dates: ${locale}${dryRun ? " (dry-run)" : ""}`);

  const sp = await migrateCollection(
    SimpleServiceProposal,
    SP_FIELDS,
    "SimpleServiceProposal",
    toMongoCalendarDate
  );
  console.log("SimpleServiceProposal:", sp);

  const po = await migrateCollection(
    SimplePurchaseOrder,
    PO_FIELDS,
    "SimplePurchaseOrder",
    toMongoCalendarDate
  );
  console.log("SimplePurchaseOrder:", po);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
