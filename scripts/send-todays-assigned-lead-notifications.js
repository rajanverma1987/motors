/**
 * Send today's assigned-shop lead notifications to listing login email
 * plus extra notificationEmails.
 *
 * Usage (from repo root):
 *   node scripts/send-todays-assigned-lead-notifications.js
 *
 * Requires MONGODB_URI and SMTP_USER / SMTP_PASS in .env.local
 */

const path = require("path");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

function startOfTodayIst() {
  return new Date("2026-09-08T00:00:00.000+05:30");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const jiti = createJiti(__filename, {
    interopDefault: true,
    alias: { "@": path.join(root, "src") },
  });

  const { connectDB } = jiti(path.join(root, "src/lib/db.js"));
  const { getPublicSiteUrl } = jiti(path.join(root, "src/lib/public-site-url.js"));
  const { sendNewWebsiteLeadNotificationToShop } = jiti(path.join(root, "src/lib/email.js"));
  const { getListingNotifyEmailsIncludingCrmLogin } = jiti(
    path.join(root, "src/lib/listing-notify-emails.js")
  );
  const Lead = jiti(path.join(root, "src/models/Lead.js")).default;
  const Listing = jiti(path.join(root, "src/models/Listing.js")).default;

  await connectDB();

  const since = startOfTodayIst();
  const leads = await Lead.find({
    createdAt: { $gte: since },
    assignedListingIds: { $exists: true, $ne: [] },
  })
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Leads since ${since.toISOString()} with assigned shops: ${leads.length}`);
  if (leads.length === 0) {
    process.exit(0);
  }

  const listingIds = [
    ...new Set(leads.flatMap((lead) => (lead.assignedListingIds || []).map((id) => String(id || "").trim()).filter(Boolean))),
  ];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("email companyName notificationEmails crmUserId isSeed status")
    .lean();
  const listingById = new Map(listings.map((doc) => [doc._id.toString(), doc]));
  const siteUrl = getPublicSiteUrl();

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const lead of leads) {
    const assigned = (lead.assignedListingIds || []).map((id) => String(id || "").trim()).filter(Boolean);
    console.log(
      `\nLead ${lead._id} | ${lead.createdAt?.toISOString?.() || lead.createdAt} | ${lead.name || ""} | ${lead.company || ""} | assigned ${assigned.length}`
    );
    for (const listingId of assigned) {
      const listing = listingById.get(listingId);
      if (!listing) {
        console.log(`  skip missing listing ${listingId}`);
        skippedCount += 1;
        continue;
      }
      if (listing.status && listing.status !== "approved") {
        console.log(`  skip ${listing.companyName || listingId} (status ${listing.status})`);
        skippedCount += 1;
        continue;
      }
      const emails = await getListingNotifyEmailsIncludingCrmLogin(listing);
      if (emails.length === 0) {
        console.log(`  skip ${listing.companyName || listingId} (no login or notification emails)`);
        skippedCount += 1;
        continue;
      }
      for (const to of emails) {
        const result = await sendNewWebsiteLeadNotificationToShop({
          to,
          listingCompanyName: listing.companyName || "",
          leadContactName: lead.name,
          leadContactCompany: lead.company,
          siteUrl,
        });
        if (result && result.ok === false) {
          failedCount += 1;
          console.log(`  FAIL ${listing.companyName} -> ${to}: ${result.error || "unknown"}`);
        } else {
          sentCount += 1;
          console.log(`  SENT ${listing.companyName} -> ${to}`);
        }
        await sleep(250);
      }
    }
  }

  console.log(`\nDone. sent=${sentCount} failed=${failedCount} skipped=${skippedCount}`);
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
