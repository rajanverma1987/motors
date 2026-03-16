import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendListingApproved, sendListingRejected, sendShopListedNotificationToAdmin } from "@/lib/email";
import { getListingSlug } from "@/lib/listing-slug";
import { ensureLocationPageForArea } from "@/lib/location-pages-public";
import { notifyAreaRequestsForListing } from "@/lib/notify-area-when-listed";

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
    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
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
      await doc.save();

      if (newStatus === "approved") {
        await sendListingApproved(doc.email, doc.companyName);
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
        const slug = getListingSlug(doc.companyName, doc._id.toString());
        revalidatePath("/electric-motor-reapir-shops-listings");
        revalidatePath(`/electric-motor-reapir-shops-listings/${slug}`);
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

    // General update (admin editing fields)
    const allowed = [
      "companyName", "logoUrl", "shortDescription", "yearsInBusiness", "phone", "website",
      "primaryContactPerson", "address", "city", "state", "zipCode", "country",
      "services", "maxMotorSizeHP", "maxVoltage", "maxWeightHandled", "motorCapabilities",
      "equipmentTesting", "rewindingCapabilities", "industriesServed",
      "pickupDeliveryAvailable", "craneCapacity", "forkliftCapacity", "rushRepairAvailable",
      "turnaroundTime", "certifications", "shopSizeSqft", "numTechnicians", "numEngineers",
      "yearsCombinedExperience", "galleryPhotoUrls", "serviceZipCode", "serviceRadiusMiles",
      "statesServed", "citiesOrMetrosServed", "areaCoveredFrom",
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        doc[key] = updates[key];
      }
    }
    await doc.save();

    revalidatePath("/electric-motor-reapir-shops-listings");
    const slug = getListingSlug(doc.companyName, doc._id.toString());
    revalidatePath(`/electric-motor-reapir-shops-listings/${slug}`);

    return NextResponse.json({
      ok: true,
      listing: {
        ...doc.toObject(),
        id: doc._id.toString(),
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
