/**
 * One-shot: set Quote.status from "draft" → "write-up" (RFQ intake default).
 *
 * Usage (from repo root):
 *   node scripts/backfill-quote-draft-to-write-up.js
 *   node scripts/backfill-quote-draft-to-write-up.js --dry-run
 *   npm run backfill:quote-write-up
 *
 * Requires MONGODB_URI in .env or .env.local
 */

const path = require("path");
const mongoose = require("mongoose");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

const WRITE_UP = "write-up";

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: { "@": path.join(root, "src") },
  });

  const { connectDB } = jiti(path.join(root, "src/lib/db.js"));
  const Quote = jiti(path.join(root, "src/models/Quote.js")).default;

  await connectDB();

  const filter = { status: { $regex: /^draft$/i } };

  const count = await Quote.countDocuments(filter);
  console.log(`Quotes with status "draft" (case-insensitive): ${count}`);

  if (dryRun) {
    console.log(`Dry run — would set status to "${WRITE_UP}" on ${count} document(s).`);
    return;
  }

  if (count === 0) {
    console.log("Nothing to update.");
    return;
  }

  const result = await Quote.updateMany(filter, { $set: { status: WRITE_UP } });
  const modified = result.modifiedCount ?? result.nModified ?? 0;
  console.log(`Updated ${modified} quote(s) to status "${WRITE_UP}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {
      /* ignore */
    }
    if (process.exitCode) process.exit(process.exitCode);
  });
