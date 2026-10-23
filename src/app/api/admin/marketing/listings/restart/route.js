import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import ListingMarketingState from "@/models/ListingMarketingState";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await request.json();
    const ids = Array.isArray(body?.listingIds)
      ? body.listingIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one listing." }, { status: 400 });
    }

    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const listings = await Listing.find({
      _id: { $in: objectIds },
      status: "approved",
      email: { $exists: true, $nin: [null, ""] },
    })
      .select("_id")
      .lean();

    let restarted = 0;
    for (const listing of listings) {
      const existing = await ListingMarketingState.findOne({ listingId: listing._id });
      const nextCycle = Number(existing?.cycleId || 0) + 1;
      await ListingMarketingState.findOneAndUpdate(
        { listingId: listing._id },
        {
          $set: {
            listingId: listing._id,
            cycleId: nextCycle,
            emailsInCycle: 0,
            awaitingRestartTemplate: true,
            unsubscribedAt: null,
            lastEmailSentAt: null,
          },
        },
        { upsert: true, new: true }
      );
      restarted++;
    }

    return NextResponse.json({ ok: true, restarted });
  } catch (err) {
    console.error("Marketing restart error:", err);
    return NextResponse.json({ error: err.message || "Restart failed" }, { status: 500 });
  }
}
