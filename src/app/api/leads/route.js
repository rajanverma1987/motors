import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendNewWebsiteLeadNotificationToShop } from "@/lib/email";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "lead", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }
  try {
    await connectDB();
    const body = await request.json();
    const {
      name,
      email,
      phone,
      message,
      listingId,
      company,
      city,
      zipCode,
      motorType,
      motorHp,
      voltage,
      problemDescription,
      urgencyLevel,
      motorPhotos,
    } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email required" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    let sourceListingId = "";
    let assignedListingIds = [];
    /** If RFQ came from a public listing page, notify that shop by email after create. */
    let listingNotify = null;
    const rawListingId = listingId != null ? String(listingId).trim() : "";
    if (rawListingId) {
      if (!mongoose.isValidObjectId(rawListingId)) {
        return NextResponse.json({ error: "Invalid listing reference." }, { status: 400 });
      }
      const listingDoc = await Listing.findOne({ _id: rawListingId, status: "approved" })
        .select("_id email companyName")
        .lean();
      if (!listingDoc) {
        return NextResponse.json(
          { error: "Listing not found or not available for inquiries." },
          { status: 400 }
        );
      }
      sourceListingId = listingDoc._id.toString();
      /** Shop sees this lead in CRM; admin list shows it assigned to this listing company. */
      assignedListingIds = [sourceListingId];
      listingNotify = {
        email: listingDoc.email ? String(listingDoc.email).trim() : "",
        companyName: listingDoc.companyName || "",
      };
    }

    const doc = await Lead.create({
      name: clampString(name, LIMITS.name.max),
      email: (email.trim().toLowerCase()).slice(0, LIMITS.email.max),
      phone: clampString(phone, 30),
      message: clampString(message, LIMITS.message.max),
      company: clampString(company, LIMITS.companyName.max),
      city: clampString(city, LIMITS.city.max),
      zipCode: clampString(zipCode, LIMITS.zip.max),
      motorType: clampString(motorType, LIMITS.shortText.max),
      motorHp: clampString(motorHp, LIMITS.shortText.max),
      voltage: clampString(voltage, LIMITS.shortText.max),
      problemDescription: clampString(problemDescription, LIMITS.message.max),
      urgencyLevel: clampString(urgencyLevel, LIMITS.shortText.max),
      motorPhotos: clampArray(motorPhotos, 20),
      sourceListingId: clampString(sourceListingId, 50),
      assignedListingIds,
      leadSource: "website",
    });

    if (listingNotify?.email && isValidEmail(listingNotify.email)) {
      try {
        await sendNewWebsiteLeadNotificationToShop({
          to: listingNotify.email,
          listingCompanyName: listingNotify.companyName,
          leadContactName: doc.name,
          leadContactCompany: doc.company,
          siteUrl: getPublicSiteUrl(request),
        });
      } catch (e) {
        console.warn("Notify listing shop of new lead email failed:", e);
      }
    }

    return NextResponse.json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    console.error("Create lead error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const list = await Lead.find()
      .sort({ createdAt: -1 })
      .lean();
    const listWithId = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("List leads error:", err);
    return NextResponse.json(
      { error: "Failed to list" },
      { status: 500 }
    );
  }
}
