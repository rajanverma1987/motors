/**
 * Renumber existing job POs to PO-{RFQ#}-1, PO-{RFQ#}-2, … (oldest first per RFQ).
 *
 * Usage (from repo root):
 *   node scripts/backfill-job-po-numbers.js
 *   node scripts/backfill-job-po-numbers.js --dry-run
 *   npm run backfill:job-po-numbers
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

function tempPoNumber(id) {
  return `__migrate__${String(id)}`;
}

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: { "@": path.join(root, "src") },
  });

  const { connectDB } = jiti(path.join(root, "src/lib/db.js"));
  const PurchaseOrder = jiti(path.join(root, "src/models/PurchaseOrder.js")).default;
  const Quote = jiti(path.join(root, "src/models/Quote.js")).default;
  const LogisticsEntry = jiti(path.join(root, "src/models/LogisticsEntry.js")).default;
  const {
    buildJobPoRenumberPlan,
    resolveQuoteIdForJobPo,
  } = jiti(path.join(root, "src/lib/purchase-order-numbers.js"));

  await connectDB();

  const jobPos = await PurchaseOrder.find({ type: "job" })
    .select("_id poNumber quoteId repairFlowJobId createdByEmail createdAt")
    .sort({ createdByEmail: 1, createdAt: 1 })
    .lean();

  const quoteIds = new Set();
  for (const po of jobPos) {
    const qid = await resolveQuoteIdForJobPo(
      po.createdByEmail,
      po.quoteId,
      po.repairFlowJobId
    );
    if (qid) quoteIds.add(qid);
  }

  const quotes = await Quote.find({ _id: { $in: [...quoteIds] } })
    .select("_id rfqNumber")
    .lean();
  const quoteById = new Map(quotes.map((q) => [String(q._id), q]));

  const updates = await buildJobPoRenumberPlan(jobPos, quoteById, resolveQuoteIdForJobPo);
  const needsNumberChange = updates.filter((u) => u.oldNumber !== u.newNumber);
  const quoteIdOnlyUpdates = updates.filter((u) => u.oldNumber === u.newNumber && u.setQuoteId);

  let noRfqLink = 0;
  for (const po of jobPos) {
    const qid = await resolveQuoteIdForJobPo(
      po.createdByEmail,
      po.quoteId,
      po.repairFlowJobId
    );
    if (!qid) noRfqLink += 1;
  }

  const alreadyCorrect =
    jobPos.length - noRfqLink - needsNumberChange.length - quoteIdOnlyUpdates.length;

  console.log(`Job POs found: ${jobPos.length}`);
  console.log(`No RFQ link (skipped): ${noRfqLink}`);
  console.log(`Already correct: ${Math.max(0, alreadyCorrect)}`);
  console.log(`To renumber: ${needsNumberChange.length}`);

  if (needsNumberChange.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  for (const row of needsNumberChange.slice(0, 20)) {
    console.log(`  ${row.oldNumber || "—"} → ${row.newNumber} (${row.email})`);
  }
  if (needsNumberChange.length > 20) {
    console.log(`  … and ${needsNumberChange.length - 20} more`);
  }

  if (dryRun) {
    console.log("Dry run — no documents changed.");
    return;
  }

  // Two-pass rename avoids unique-index collisions on poNumber.
  for (const row of updates) {
    if (row.oldNumber === row.newNumber && !row.setQuoteId) continue;
    await PurchaseOrder.updateOne(
      { _id: row.id },
      { $set: { poNumber: tempPoNumber(row.id) } }
    );
  }

  for (const row of updates) {
    const patch = { poNumber: row.newNumber };
    if (row.setQuoteId) patch.quoteId = row.setQuoteId;
    await PurchaseOrder.updateOne({ _id: row.id }, { $set: patch });

    if (row.oldNumber !== row.newNumber) {
      await LogisticsEntry.updateMany(
        { purchaseOrderId: new mongoose.Types.ObjectId(row.id) },
        { $set: { poNumberSnapshot: row.newNumber } }
      );
    }
  }

  console.log(`Updated ${updates.length} job PO(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  });
