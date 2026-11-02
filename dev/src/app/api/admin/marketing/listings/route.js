import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import ListingMarketingState from "@/models/ListingMarketingState";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  LISTING_MARKETING_DAILY_LIMIT,
  LISTING_MARKETING_FOLLOW_UP_DAYS,
  LISTING_MARKETING_MAX_EMAILS_IN_CYCLE,
} from "@/lib/listing-marketing-constants";

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function campaignLabel(state) {
  if (state?.unsubscribedAt) return "Unsubscribed";
  if (state?.awaitingRestartTemplate) return "Restart queued";
  const n = Number(state?.emailsInCycle || 0);
  if (n <= 0) return "Not contacted";
  if (n >= LISTING_MARKETING_MAX_EMAILS_IN_CYCLE) return "Completed";
  return `In cycle ${n}/${LISTING_MARKETING_MAX_EMAILS_IN_CYCLE}`;
}

function deliveryLabel(latestEmail) {
  if (!latestEmail) return "None";
  if (latestEmail.status === "failed") return "Failed";
  if (latestEmail.complainedAt) return "Complained";
  if (latestEmail.bouncedAt) return "Bounced";
  if (latestEmail.suppressedAt) return "Suppressed";
  if (latestEmail.clickedAt) return "Clicked";
  if (latestEmail.openedAt) return "Opened";
  if (latestEmail.deliveredAt) return "Delivered";
  if (latestEmail.delayedAt) return "Delayed";
  if (latestEmail.resendId || latestEmail.status === "sent") return "Sent";
  return "None";
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "")
      .trim()
      .toLowerCase();

    const filter = {
      status: "approved",
      email: { $exists: true, $nin: [null, ""] },
    };
    if (q) {
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { primaryContactPerson: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { state: { $regex: q, $options: "i" } },
      ];
    }

    const listings = await Listing.find(filter)
      .select(
        "companyName email primaryContactPerson city state phone urlSlug status createdAt updatedAt"
      )
      .sort({ companyName: 1 })
      .lean();

    const ids = listings.map((l) => l._id);
    const states = await ListingMarketingState.find({ listingId: { $in: ids } }).lean();
    const stateByListing = Object.fromEntries(states.map((s) => [String(s.listingId), s]));

    const latestEmails = await ListingMarketingEmail.aggregate([
      { $match: { listingId: { $in: ids }, status: "sent" } },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: "$listingId",
          doc: { $first: "$$ROOT" },
        },
      },
    ]);
    const latestByListing = Object.fromEntries(
      latestEmails.map((row) => [String(row._id), row.doc])
    );

    const dayStart = startOfUtcDay();
    const sentToday = await ListingMarketingEmail.countDocuments({
      status: "sent",
      sentAt: { $gte: dayStart },
    });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = await ListingMarketingEmail.find({
      status: "sent",
      sentAt: { $gte: since },
    })
      .select("deliveredAt openedAt clickedAt bouncedAt complainedAt")
      .lean();

    const unsubscribedCount = states.filter((s) => s?.unsubscribedAt).length;

    const summary = {
      sentToday,
      dailyLimit: LISTING_MARKETING_DAILY_LIMIT,
      remainingToday: Math.max(0, LISTING_MARKETING_DAILY_LIMIT - sentToday),
      followUpDays: LISTING_MARKETING_FOLLOW_UP_DAYS,
      unsubscribed: unsubscribedCount,
      last30Days: {
        sent: recent.length,
        delivered: recent.filter((e) => e.deliveredAt || e.openedAt || e.clickedAt).length,
        // Click without open pixel still counts as opened.
        opened: recent.filter((e) => e.openedAt || e.clickedAt).length,
        clicked: recent.filter((e) => e.clickedAt).length,
        bounced: recent.filter((e) => e.bouncedAt).length,
        complained: recent.filter((e) => e.complainedAt).length,
      },
    };

    const rows = listings.map((l) => {
      const id = String(l._id);
      const state = stateByListing[id] || null;
      const latest = latestByListing[id] || null;
      return {
        id,
        companyName: l.companyName || "",
        email: l.email || "",
        primaryContactPerson: l.primaryContactPerson || "",
        city: l.city || "",
        state: l.state || "",
        phone: l.phone || "",
        urlSlug: l.urlSlug || "",
        campaignStatus: campaignLabel(state),
        deliveryStatus: deliveryLabel(latest),
        emailsInCycle: Number(state?.emailsInCycle || 0),
        cycleId: Number(state?.cycleId || 1),
        awaitingRestartTemplate: Boolean(state?.awaitingRestartTemplate),
        unsubscribedAt: state?.unsubscribedAt || null,
        lastEmailSentAt: state?.lastEmailSentAt || latest?.sentAt || null,
        lastTemplateKey: latest?.templateKey || "",
      };
    });

    return NextResponse.json({ rows, summary });
  } catch (err) {
    console.error("Marketing listings get error:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}
