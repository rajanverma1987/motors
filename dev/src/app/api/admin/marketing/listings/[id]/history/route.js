import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";
import ListingMarketingState from "@/models/ListingMarketingState";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function GET(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params =
      typeof context?.params?.then === "function" ? await context.params : context?.params;
    const id = String(params?.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    await connectDB();
    const listing = await Listing.findById(id)
      .select("companyName email primaryContactPerson")
      .lean();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const state = await ListingMarketingState.findOne({ listingId: listing._id }).lean();
    const emails = await ListingMarketingEmail.find({ listingId: listing._id })
      .sort({ sentAt: -1 })
      .lean();

    return NextResponse.json({
      listing: {
        id: String(listing._id),
        companyName: listing.companyName || "",
        email: listing.email || "",
        primaryContactPerson: listing.primaryContactPerson || "",
      },
      state: state
        ? {
            cycleId: state.cycleId,
            emailsInCycle: state.emailsInCycle,
            awaitingRestartTemplate: state.awaitingRestartTemplate,
            unsubscribedAt: state.unsubscribedAt,
            lastEmailSentAt: state.lastEmailSentAt,
          }
        : null,
      emails: emails.map((e) => ({
        id: String(e._id),
        cycleId: e.cycleId,
        templateKey: e.templateKey,
        to: e.to,
        subject: e.subject,
        sentAt: e.sentAt,
        status: e.status,
        error: e.error || "",
        resendId: e.resendId || "",
        deliveredAt: e.deliveredAt,
        openedAt: e.openedAt,
        clickedAt: e.clickedAt,
        bouncedAt: e.bouncedAt,
        complainedAt: e.complainedAt,
        failedAt: e.failedAt,
        delayedAt: e.delayedAt,
        suppressedAt: e.suppressedAt,
        lastEventType: e.lastEventType || "",
        lastEventAt: e.lastEventAt,
        bounceType: e.bounceType || "",
        bounceMessage: e.bounceMessage || "",
        clickCount: e.clickCount || 0,
        events: Array.isArray(e.events) ? e.events : [],
      })),
    });
  } catch (err) {
    console.error("Marketing history error:", err);
    return NextResponse.json({ error: err.message || "Failed to load history" }, { status: 500 });
  }
}
