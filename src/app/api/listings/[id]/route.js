import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { buildEmailToCrmUserIdMap, resolveListingCrmUserId } from "@/lib/listing-crm";
import { sendListingApproved, sendListingRejected, sendShopListedNotificationToAdmin } from "@/lib/email";
import { generateUniqueListingUrlSlug } from "@/lib/listing-url-slug";
import { ensureLocationPageForArea } from "@/lib/location-pages-public";
import { notifyAreaRequestsForListing } from "@/lib/notify-area-when-listed";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { applyListingOnlySubscriptionToShop } from "@/lib/subscription-service";

export async function GET(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const doc = await Listing.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const emailMap = await buildEmailToCrmUserIdMap([doc.email]);
    const resolvedCrmUserId = resolveListingCrmUserId(doc, emailMap);
    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      crmUserId: resolvedCrmUserId,
    });
  } catch (err) {
    console.error("Get listing error:", err);
    return NextResponse.json(
      { error: "Failed to load" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const body = await request.json();
    const { status: newStatus, rejectionReason, ...updates } = body;

    const doc = await Listing.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (newStatus === "approved" || newStatus === "rejected") {
      doc.status = newStatus;
      doc.reviewedAt = new Date();
      doc.reviewedBy = admin;
      if (newStatus === "rejected") {
        doc.rejectionReason = rejectionReason || "";
      }
      if (newStatus === "approved" && !(doc.urlSlug || "").trim()) {
        doc.urlSlug = await generateUniqueListingUrlSlug(doc.companyName, doc._id);
      }
      await doc.save();

      if (newStatus === "approved") {
        await sendListingApproved(doc.email, doc.companyName);
        try {
          await applyListingOnlySubscriptionToShop(doc.email);
        } catch (e) {
          console.warn("applyListingOnlySubscriptionToShop (listing approved):", e);
        }
        try {
          await sendShopListedNotificationToAdmin(doc);
        } catch (e) {
          console.warn("Shop listed notification email failed:", e);
        }
        try {
          await notifyAreaRequestsForListing(doc);
        } catch (e) {
          console.warn("notifyAreaRequestsForListing failed:", e);
        }
        try {
          const locationPage = await ensureLocationPageForArea(doc.city, doc.state, doc.zipCode);
          if (locationPage?.slug) revalidatePath(`/motor-repair-shop/${locationPage.slug}`);
        } catch (e) {
          console.warn("ensureLocationPageForArea failed:", e);
        }
        const pathSlug = (doc.urlSlug || "").trim();
        revalidatePath("/electric-motor-reapir-shops-listings");
        if (pathSlug) revalidatePath(`/electric-motor-reapir-shops-listings/${pathSlug}`);
      } else {
        await sendListingRejected(doc.email, doc.companyName, doc.rejectionReason);
        revalidatePath("/electric-motor-reapir-shops-listings");
      }

      return NextResponse.json({
        ok: true,
        listing: {
          ...doc.toObject(),
          id: doc._id.toString(),
          _id: undefined,
        },
      });
    }

    // General update (admin editing fields) – build $set from allowed keys present in body
    const allowed = [
      "companyName", "email", "logoUrl", "shortDescription", "yearsInBusiness", "phone", "website",
      "primaryContactPerson", "address", "city", "state", "zipCode", "country",
      "services", "maxMotorSizeHP", "maxVoltage", "maxWeightHandled", "motorCapabilities",
      "equipmentTesting", "rewindingCapabilities", "industriesServed",
      "pickupDeliveryAvailable", "craneCapacity", "forkliftCapacity", "rushRepairAvailable",
      "turnaroundTime", "certifications", "shopSizeSqft", "numTechnicians", "numEngineers",
      "yearsCombinedExperience", "galleryPhotoUrls", "serviceZipCode", "serviceRadiusMiles",
      "statesServed", "citiesOrMetrosServed", "areaCoveredFrom",
    ];
    const set = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        set[key] = updates[key];
      }
    }
    if (Object.prototype.hasOwnProperty.call(set, "email")) {
      const raw = set.email;
      const e = clampString(typeof raw === "string" ? raw : String(raw ?? ""), LIMITS.email.max)
        .trim()
        .toLowerCase();
      if (!e) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }
      if (!isValidEmail(e)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      set.email = e;
    }
    if (Object.keys(set).length === 0) {
      const current = await Listing.findById(id).lean();
      return NextResponse.json({
        ok: true,
        listing: { ...current, id: current._id.toString(), _id: undefined },
      });
    }

    const saved = await Listing.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true }
    ).lean();

    if (!saved) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    revalidatePath("/electric-motor-reapir-shops-listings");
    const pathSlug = (saved.urlSlug || "").trim();
    if (pathSlug) revalidatePath(`/electric-motor-reapir-shops-listings/${pathSlug}`);

    return NextResponse.json({
      ok: true,
      listing: {
        ...saved,
        id: saved._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Update listing error:", err);
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
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    await connectDB();
    const existing = await Listing.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pathSlug = (existing.urlSlug || "").trim();
    await Listing.findByIdAndDelete(id);

    revalidatePath("/electric-motor-reapir-shops-listings");
    if (pathSlug) {
      revalidatePath(`/electric-motor-reapir-shops-listings/${pathSlug}`);
    }

    return NextResponse.json({ ok: true, id: String(existing._id) });
  } catch (err) {
    console.error("Delete listing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete" },
      { status: 500 }
    );
  }
}
