/**
 * One-shot: set directoryScore on every Listing from computeListingDirectoryScore().
 * Run after deploy or when scoring rules change. Normal app flow only updates scores on create/update (pre-save + PATCH).
 *
 * Usage (from repo root):
 *   node scripts/backfill-listing-directory-scores.js
 *   npm run backfill:listing-scores
 *
 * Requires MONGODB_URI in .env or .env.local
 */

const path = require("path");
const mongoose = require("mongoose");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

const BATCH = 200;

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: {
      "@": path.join(root, "src"),
    },
  });

  const { connectDB } = jiti(path.join(root, "src/lib/db.js"));
  const { computeListingDirectoryScore } = jiti(path.join(root, "src/lib/listing-directory-score.js"));
  const Listing = jiti(path.join(root, "src/models/Listing.js")).default;

  await connectDB();

  const all = await Listing.find({}).lean();
  const ops = [];
  let mismatch = 0;

  for (const doc of all) {
    const next = computeListingDirectoryScore(doc);
    const stored = doc.directoryScore;
    if (stored !== next) {
      mismatch += 1;
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { directoryScore: next } },
        },
      });
      if (ops.length >= BATCH) {
        await Listing.bulkWrite(ops.splice(0, BATCH), { ordered: false });
      }
    }
  }

  if (ops.length > 0) {
    await Listing.bulkWrite(ops, { ordered: false });
  }

  console.log(
    `Listings scanned: ${all.length}. Updated (score changed): ${mismatch}. Unchanged: ${all.length - mismatch}.`
  );
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
