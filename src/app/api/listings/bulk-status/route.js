import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendListingApproved, sendListingRejected } from "@/lib/email";
import { getListingSlug } from "@/lib/listing-slug";
import { notifyAreaRequestsForListing } from "@/lib/notify-area-when-listed";

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { ids = [], status: newStatus, rejectionReason = "" } = body;
    if (!Array.isArray(ids) || ids.length === 0 || !["approved", "rejected"].includes(newStatus)) {
      return NextResponse.json(
        { error: "ids (array) and status (approved|rejected) required" },
        { status: 400 }
      );
    }
    await connectDB();
    const validIds = ids.filter((id) => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id));
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "No valid listing ids (expected 24-char hex MongoDB ids)" },
        { status: 400 }
      );
    }
    let updated = 0;
    for (const id of validIds) {
      const doc = await Listing.findById(id);
      if (!doc) continue;
      doc.status = newStatus;
      doc.reviewedAt = new Date();
      doc.reviewedBy = admin;
      if (newStatus === "rejected") doc.rejectionReason = rejectionReason || "";
      await doc.save();
      if (newStatus === "approved") {
        await sendListingApproved(doc.email, doc.companyName);
        try {
          await notifyAreaRequestsForListing(doc);
        } catch (e) {
          console.warn("notifyAreaRequestsForListing failed:", e);
        }
        const slug = getListingSlug(doc.companyName, doc._id.toString());
        revalidatePath(`/electric-motor-reapir-shops-listings/${slug}`);
      } else {
        await sendListingRejected(doc.email, doc.companyName, doc.rejectionReason);
      }
      updated += 1;
    }
    revalidatePath("/electric-motor-reapir-shops-listings");
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("Bulk status error:", err);
    return NextResponse.json(
      { error: err.message || "Bulk update failed" },
      { status: 500 }
    );
  }
}
