import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import ListingMarketingState from "@/models/ListingMarketingState";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";
import MarketingTemplate from "@/models/MarketingTemplate";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendListingMarketingEmailViaResend } from "@/lib/resend-marketing";
import {
  LISTING_MARKETING_DAILY_LIMIT,
  LISTING_MARKETING_FOLLOW_UP_DAYS,
  LISTING_MARKETING_MAX_EMAILS_IN_CYCLE,
  LISTING_MARKETING_TEMPLATE_KEYS,
  templateKeyForEmailsInCycle,
} from "@/lib/listing-marketing-constants";
import { DEFAULT_LISTING_MARKETING_TEMPLATES } from "@/lib/listing-marketing-defaults";
import {
  listingMarketingContextFromListing,
  renderListingMarketingHtml,
  renderListingMarketingSubject,
} from "@/lib/listing-marketing-render";

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function loadTemplatesByKey() {
  const docs = await MarketingTemplate.find({
    key: { $in: LISTING_MARKETING_TEMPLATE_KEYS },
  }).lean();
  const byKey = {};
  for (const key of LISTING_MARKETING_TEMPLATE_KEYS) {
    const defaults = DEFAULT_LISTING_MARKETING_TEMPLATES[key];
    const doc = docs.find((d) => d.key === key);
    byKey[key] = {
      subject: String(doc?.subject || defaults.subject).trim(),
      bodyHtml: String(doc?.bodyHtml || doc?.body || defaults.bodyHtml),
    };
  }
  return byKey;
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const now = new Date();
    const dayStart = startOfUtcDay(now);
    const sentToday = await ListingMarketingEmail.countDocuments({
      status: "sent",
      sentAt: { $gte: dayStart },
    });
    const quota = Math.max(0, LISTING_MARKETING_DAILY_LIMIT - sentToday);
    if (quota <= 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped: 0,
        remainingToday: 0,
        message: `Daily limit of ${LISTING_MARKETING_DAILY_LIMIT} emails already reached (UTC day).`,
      });
    }

    const followUpCutoff = new Date(
      now.getTime() - LISTING_MARKETING_FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000
    );

    const listings = await Listing.find({
      status: "approved",
      email: { $exists: true, $nin: [null, ""] },
    })
      .select("companyName email primaryContactPerson")
      .lean();

    const states = await ListingMarketingState.find({
      listingId: { $in: listings.map((l) => l._id) },
    }).lean();
    const stateById = Object.fromEntries(states.map((s) => [String(s.listingId), s]));

    const followUps = [];
    const initials = [];
    const restarts = [];

    for (const listing of listings) {
      const id = String(listing._id);
      const state = stateById[id];
      if (state?.unsubscribedAt) continue;

      const emailsInCycle = Number(state?.emailsInCycle || 0);
      const awaitingRestart = Boolean(state?.awaitingRestartTemplate);
      const lastSent = state?.lastEmailSentAt ? new Date(state.lastEmailSentAt) : null;

      if (awaitingRestart) {
        restarts.push({ listing, state });
        continue;
      }

      if (emailsInCycle <= 0) {
        initials.push({ listing, state });
        continue;
      }

      if (
        emailsInCycle < LISTING_MARKETING_MAX_EMAILS_IN_CYCLE &&
        lastSent &&
        lastSent <= followUpCutoff
      ) {
        followUps.push({ listing, state });
      }
    }

    const queue = [...followUps, ...initials, ...restarts].slice(0, quota);
    const templates = await loadTemplatesByKey();
    let sent = 0;
    const errors = [];

    for (const item of queue) {
      const listing = item.listing;
      const state = item.state;
      const emailsInCycle = Number(state?.emailsInCycle || 0);
      const awaitingRestart = Boolean(state?.awaitingRestartTemplate);
      const templateKey = templateKeyForEmailsInCycle(emailsInCycle, awaitingRestart);
      if (!templateKey) continue;

      const tpl = templates[templateKey];
      const ctx = listingMarketingContextFromListing(listing, request);
      if (!ctx.email) continue;

      const subject = renderListingMarketingSubject(tpl.subject, ctx);
      const html = renderListingMarketingHtml(tpl.bodyHtml, ctx);
      const cycleId = Number(state?.cycleId || 1);

      const result = await sendListingMarketingEmailViaResend({
        to: ctx.email,
        subject,
        html,
        tags: {
          listingId: String(listing._id),
          cycleId: String(cycleId),
          templateKey,
        },
      });

      if (!result.ok) {
        await ListingMarketingEmail.create({
          listingId: listing._id,
          cycleId,
          templateKey,
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
        templateKey,
        to: ctx.email,
        subject,
        html,
        sentAt: now,
        resendId: result.id || "",
        status: "sent",
        lastEventType: "email.sent",
        lastEventAt: now,
        events: [{ type: "email.sent", at: now }],
      });

      const nextEmailsInCycle = awaitingRestart || emailsInCycle <= 0 ? 1 : emailsInCycle + 1;
      await ListingMarketingState.findOneAndUpdate(
        { listingId: listing._id },
        {
          $set: {
            listingId: listing._id,
            cycleId,
            emailsInCycle: nextEmailsInCycle,
            lastEmailSentAt: now,
            awaitingRestartTemplate: false,
          },
        },
        { upsert: true, new: true }
      );
      sent++;
    }

    const remainingToday = Math.max(0, LISTING_MARKETING_DAILY_LIMIT - (sentToday + sent));
    return NextResponse.json({
      ok: true,
      sent,
      attempted: queue.length,
      remainingToday,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("Marketing send-batch error:", err);
    return NextResponse.json({ error: err.message || "Send failed" }, { status: 500 });
  }
}
