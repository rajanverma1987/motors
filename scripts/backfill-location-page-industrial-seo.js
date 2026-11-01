/**
 * Backfill existing LocationPage title + metaDescription to industrial SEO framing.
 *
 * Usage (from repo root):
 *   node scripts/backfill-location-page-industrial-seo.js
 *   npm run backfill:location-industrial-seo
 *
 * Dry run (no writes):
 *   node scripts/backfill-location-page-industrial-seo.js --dry-run
 *
 * Requires MONGODB_URI in .env or .env.local
 */

const path = require("path");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: {
      "@": path.join(root, "src"),
    },
  });

  const { connectDB } = jiti(path.join(root, "src/lib/db.js"));
  const {
    buildIndustrialLocationPageTitle,
    buildIndustrialLocationPageMetaDescription,
  } = jiti(path.join(root, "src/lib/location-pages-public.js"));
  const LocationPage = jiti(path.join(root, "src/models/LocationPage.js")).default;

  await connectDB();

  const all = await LocationPage.find({}).lean();
  let changed = 0;
  let skipped = 0;
  const ops = [];

  for (const doc of all) {
    const nextTitle = buildIndustrialLocationPageTitle(doc.city, doc.state);
    const nextMeta = buildIndustrialLocationPageMetaDescription(doc.city, doc.state);
    const titleSame = String(doc.title || "").trim() === nextTitle;
    const metaSame = String(doc.metaDescription || "").trim() === nextMeta;
    if (titleSame && metaSame) {
      skipped += 1;
      continue;
    }
    changed += 1;
    console.log(
      `${dryRun ? "[dry-run] " : ""}update ${doc.slug}: title ${titleSame ? "ok" : "→ industrial"}, meta ${metaSame ? "ok" : "→ industrial"}`
    );
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            title: nextTitle,
            metaDescription: nextMeta,
          },
        },
      },
    });
  }

  if (!dryRun && ops.length) {
    await LocationPage.bulkWrite(ops, { ordered: false });
  }

  console.log(
    `Done. total=${all.length} updated=${changed} alreadyIndustrial=${skipped} dryRun=${dryRun}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
