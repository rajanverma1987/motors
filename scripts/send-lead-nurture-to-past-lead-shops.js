/**
 * One-shot: send the IQMotorBase platform nurture email to every shop that has
 * already received a website or IQMotorTrack repair lead and is not a paying
 * IQMotorBase customer.
 *
 * Skips: paying shops, opted-out emails, contact_view leads,
 * shops that already received this nurture email.
 * Includes seed directory listings.
 *
 * Usage (from repo root):
 *   node scripts/send-lead-nurture-to-past-lead-shops.js
 *   node scripts/send-lead-nurture-to-past-lead-shops.js --dry-run
 *
 * Requires MONGODB_URI and SMTP_USER / SMTP_PASS in .env.local
 */

const path = require("path");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

const dryRun = process.argv.includes("--dry-run");

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
  const { maybeSendLeadPlatformNurtureEmail } = jiti(path.join(root, "src/lib/lead-nurture.js"));
  const Lead = jiti(path.join(root, "src/models/Lead.js")).default;
  const Listing = jiti(path.join(root, "src/models/Listing.js")).default;

  await connectDB();

  const leads = await Lead.find({
    leadSource: { $in: ["website", "iqmotortrack", "admin_assigned"] },
    leadType: { $nin: ["contact_view"] },
    assignedListingIds: { $exists: true, $ne: [] },
  })
    .select("assignedListingIds sourceListingId leadSource")
    .lean();

  const listingIdSet = new Set();
  for (const lead of leads) {
    for (const id of lead.assignedListingIds || []) {
      const s = String(id || "").trim();
      if (s) listingIdSet.add(s);
    }
    const src = String(lead.sourceListingId || "").trim();
    if (src) listingIdSet.add(src);
  }

  const listingIds = [...listingIdSet];
  console.log(`Repair leads scanned: ${leads.length}`);
  console.log(`Unique assigned/source listing ids: ${listingIds.length}`);
  console.log(dryRun ? "Mode: DRY RUN (no emails sent)\n" : "Mode: SEND\n");

  if (listingIds.length === 0) {
    process.exit(0);
  }

  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("email companyName primaryContactPerson notificationEmails crmUserId status")
    .lean();

  const siteUrl = getPublicSiteUrl();
  const counts = {
    sent: 0,
    failed: 0,
    paying_customer: 0,
    opted_out: 0,
    already_sent: 0,
    no_email: 0,
      skipped_status: 0,
      missing: 0,
      other: 0,
    };

  const foundIds = new Set(listings.map((l) => l._id.toString()));
  for (const id of listingIds) {
    if (!foundIds.has(id)) {
      counts.missing += 1;
      console.log(`skip missing listing ${id}`);
    }
  }

  for (const listing of listings) {
    const label = listing.companyName || listing._id.toString();
    if (listing.status && listing.status !== "approved") {
      counts.skipped_status += 1;
      console.log(`skip status=${listing.status}: ${label}`);
      continue;
    }

    if (dryRun) {
      const { listingIsPayingIqMotorBaseCustomer, isLeadNurtureOptedOut, normalizeLeadNurtureEmail } =
        jiti(path.join(root, "src/lib/lead-nurture.js"));
      const to = normalizeLeadNurtureEmail(listing.email);
      if (!to) {
        counts.no_email += 1;
        console.log(`dry-run skip no_email: ${label}`);
        continue;
      }
      if (await listingIsPayingIqMotorBaseCustomer(listing)) {
        counts.paying_customer += 1;
        console.log(`dry-run skip paying: ${label} <${to}>`);
        continue;
      }
      if (await isLeadNurtureOptedOut(to)) {
        counts.opted_out += 1;
        console.log(`dry-run skip opted_out: ${label} <${to}>`);
        continue;
      }
      counts.sent += 1;
      console.log(`dry-run WOULD SEND: Hi ${label}, <${to}>`);
      continue;
    }

    const result = await maybeSendLeadPlatformNurtureEmail({
      listing,
      siteUrl,
      source: "backfill",
      ignoreCooldown: true,
      skipIfAlreadySent: true,
    });

    if (result.sent) {
      counts.sent += 1;
      console.log(`SENT Hi ${label}, -> ${result.to}`);
    } else {
      const reason = result.reason || "other";
      if (counts[reason] != null) counts[reason] += 1;
      else counts.other += 1;
      console.log(`skip ${reason}: ${label}`);
      if (reason === "send_failed" || reason === "Email not configured. Set SMTP_USER and SMTP_PASS.") {
        counts.failed += 1;
      }
    }

    await sleep(300);
  }

  console.log("\nDone.");
  console.log(JSON.stringify(counts, null, 2));
  process.exit(counts.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
