import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendNewWebsiteLeadNotificationToShop } from "@/lib/email";
import { getListingNotifyEmails } from "@/lib/listing-notify-emails";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function normalizeListingId(id) {
  return String(id || "").trim();
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const body = await request.json();
    const { assignedListingIds } = body;
    const doc = await Lead.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (Array.isArray(assignedListingIds)) {
      const previousIds = new Set((doc.assignedListingIds || []).map(normalizeListingId).filter(Boolean));
      const nextIds = assignedListingIds
        .map(normalizeListingId)
        .filter((lid) => lid && mongoose.isValidObjectId(lid))
        .slice(0, 3);
      doc.assignedListingIds = nextIds;
      await doc.save();

      const newlyAssigned = nextIds.filter((lid) => !previousIds.has(lid));
      if (newlyAssigned.length > 0) {
        const listings = await Listing.find({ _id: { $in: newlyAssigned }, status: "approved" })
          .select("email companyName notificationEmails")
          .lean();
        const siteUrl = getPublicSiteUrl(request);
        for (const listing of listings) {
          for (const to of getListingNotifyEmails(listing)) {
            try {
              await sendNewWebsiteLeadNotificationToShop({
                to,
                listingCompanyName: listing.companyName || "",
                leadContactName: doc.name,
                leadContactCompany: doc.company,
                siteUrl,
              });
            } catch (e) {
              console.warn("Notify newly assigned listing of lead failed:", e);
            }
          }
        }
      }
    }
    return NextResponse.json({
      ok: true,
      lead: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Update lead error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Lead.findByIdAndDelete(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete lead error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete" },
      { status: 500 }
    );
  }
}
