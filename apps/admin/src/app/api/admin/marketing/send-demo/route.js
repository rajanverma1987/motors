import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import ListingMarketingState from "@/models/ListingMarketingState";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";
import MarketingTemplate from "@/models/MarketingTemplate";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendListingMarketingEmailViaResend } from "@/lib/resend-marketing";
import { LISTING_MARKETING_DAILY_LIMIT } from "@/lib/listing-marketing-constants";
import { DEFAULT_LISTING_MARKETING_TEMPLATES } from "@/lib/listing-marketing-defaults";
import {
  listingMarketingContextFromListing,
  renderListingMarketingHtml,
  renderListingMarketingSubject,
} from "@/lib/listing-marketing-render";
import { getMarketingSiteUrl } from "@/lib/public-site-url";

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number(body?.dailyLimit);
    const dailyLimit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 5000)
        : LISTING_MARKETING_DAILY_LIMIT;

    const now = new Date();
    const dayStart = startOfUtcDay(now);
    const sentToday = await ListingMarketingEmail.countDocuments({
      status: "sent",
      sentAt: { $gte: dayStart },
    });
    const quota = Math.max(0, dailyLimit - sentToday);
    if (quota <= 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped: 0,
        remainingToday: 0,
        dailyLimit,
        message: `Daily limit of ${dailyLimit} emails already reached (UTC day).`,
      });
    }

    const defaults = DEFAULT_LISTING_MARKETING_TEMPLATES.demo;
    const saved = await MarketingTemplate.findOne({ key: "demo" }).lean();
    const subjectTemplate = String(saved?.subject || defaults.subject).trim();
    const bodyTemplate = String(saved?.bodyHtml || saved?.body || defaults.bodyHtml);

    const listings = await Listing.find({
      status: "approved",
      email: { $exists: true, $nin: [null, ""] },
    })
      .select("companyName email primaryContactPerson")
      .sort({ companyName: 1 })
      .lean();

    const states = await ListingMarketingState.find({
      listingId: { $in: listings.map((l) => l._id) },
    })
      .select("listingId unsubscribedAt cycleId")
      .lean();
    const stateById = Object.fromEntries(states.map((s) => [String(s.listingId), s]));

    const alreadySent = await ListingMarketingEmail.find({
      templateKey: "demo",
      status: "sent",
      listingId: { $in: listings.map((l) => l._id) },
    })
      .select("listingId")
      .lean();
    const sentIds = new Set(alreadySent.map((row) => String(row.listingId)));

    const queue = [];
    let skipped = 0;
    for (const listing of listings) {
      const id = String(listing._id);
      if (stateById[id]?.unsubscribedAt) {
        skipped += 1;
        continue;
      }
      if (sentIds.has(id)) {
        skipped += 1;
        continue;
      }
      queue.push(listing);
      if (queue.length >= quota) break;
    }

    const site = getMarketingSiteUrl();
    let sent = 0;
    const errors = [];

    for (const listing of queue) {
      const state = stateById[String(listing._id)];
      const ctx = listingMarketingContextFromListing(listing, request);
      if (!ctx.email) continue;

      const watchToken = randomBytes(24).toString("base64url");
      const watchUrl = `${site}/watch-demo/${watchToken}`;
      const subject = renderListingMarketingSubject(subjectTemplate, ctx);
      const html = renderListingMarketingHtml(bodyTemplate, { ...ctx, watchUrl });
      const cycleId = Number(state?.cycleId || 1);

      const result = await sendListingMarketingEmailViaResend({
        to: ctx.email,
        subject,
        html,
        tags: {
          listingId: String(listing._id),
          cycleId: String(cycleId),
          templateKey: "demo",
        },
      });

      if (!result.ok) {
        await ListingMarketingEmail.create({
          listingId: listing._id,
          cycleId,
          templateKey: "demo",
          to: ctx.email,
          subject,
          html,
          sentAt: now,
          status: "failed",
          error: result.error || "Send failed",
        });
        errors.push({ email: ctx.email, error: result.error || "Send failed" });
        continue;
      }

      await ListingMarketingEmail.create({
        listingId: listing._id,
        cycleId,
        templateKey: "demo",
        to: ctx.email,
        subject,
        html,
        sentAt: now,
        resendId: result.id || "",
        status: "sent",
        watchToken,
        lastEventType: "email.sent",
        lastEventAt: now,
        events: [{ type: "email.sent", at: now }],
      });
      sent += 1;
    }

    const remainingToday = Math.max(0, dailyLimit - (sentToday + sent));
    const waiting =
      listings.filter((listing) => {
        const id = String(listing._id);
        if (stateById[id]?.unsubscribedAt) return false;
        if (sentIds.has(id)) return false;
        return true;
      }).length - sent;
    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      waiting,
      attempted: queue.length,
      remainingToday,
      dailyLimit,
      message: `Sent ${sent} demo email(s). ${waiting} shop(s) still waiting. Remaining today: ${remainingToday}.`,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("Marketing send-demo error:", err);
    return NextResponse.json({ error: err.message || "Send failed" }, { status: 500 });
  }
}
