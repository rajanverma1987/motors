import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";

const STATUS_VALUES = ["new", "contacted", "quoted", "won", "lost"];

async function getListingIdsForUser(email) {
  if (!email) return [];
  const listings = await Listing.find({ email: email.trim().toLowerCase() })
    .select("_id")
    .lean();
  return listings.map((l) => l._id.toString());
}

function leadBelongsToShop(lead, listingIds, userEmail) {
  const email = (userEmail || "").trim().toLowerCase();
  if (lead.createdByEmail?.toLowerCase() === email) return true;
  const listIds = lead.assignedListingIds || [];
  if (listIds.some((id) => listingIds.includes(id))) return true;
  if (lead.sourceListingId && listingIds.includes(lead.sourceListingId)) return true;
  return false;
}

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toLeadResponse(doc) {
  const source =
    doc.leadSource ||
    (doc.createdByEmail ? "manual" : doc.assignedListingIds?.length && !doc.sourceListingId ? "admin_assigned" : "website");
  return {
    ...doc.toObject(),
    id: doc._id.toString(),
    _id: undefined,
    source,
  };
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Lead.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const listingIds = await getListingIdsForUser(user.email);
    if (!leadBelongsToShop(doc, listingIds, user.email)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const userEmail = user.email.trim().toLowerCase();
    let source = doc.leadSource;
    if (!source) {
      if (doc.createdByEmail?.toLowerCase() === userEmail) source = "manual";
      else if (doc.sourceListingId && listingIds.includes(doc.sourceListingId)) source = "website";
      else source = "admin_assigned";
    }
    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      source,
    });
  } catch (err) {
    console.error("Dashboard get lead error:", err);
    return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Lead.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const listingIds = await getListingIdsForUser(user.email);
    if (!leadBelongsToShop(doc.toObject(), listingIds, user.email)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const {
      status,
      name,
      email,
      phone,
      message,
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

    if (name !== undefined) {
      const v = clampString(name, LIMITS.name.max);
      if (!v) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      doc.name = v;
    }
    if (email !== undefined) {
      const v = email?.trim();
      if (!v) return NextResponse.json({ error: "Email is required" }, { status: 400 });
      if (!isValidEmail(v)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      doc.email = v.toLowerCase().slice(0, LIMITS.email.max);
    }
    if (phone !== undefined) doc.phone = clampString(phone, 30);
    if (message !== undefined) doc.message = clampString(message, LIMITS.message.max);
    if (company !== undefined) doc.company = clampString(company, LIMITS.companyName.max);
    if (city !== undefined) doc.city = clampString(city, LIMITS.city.max);
    if (zipCode !== undefined) doc.zipCode = clampString(zipCode, LIMITS.zip.max);
    if (motorType !== undefined) doc.motorType = clampString(motorType, LIMITS.shortText.max);
    if (motorHp !== undefined) doc.motorHp = clampString(motorHp, LIMITS.shortText.max);
    if (voltage !== undefined) doc.voltage = clampString(voltage, LIMITS.shortText.max);
    if (problemDescription !== undefined) doc.problemDescription = clampString(problemDescription, LIMITS.message.max);
    if (urgencyLevel !== undefined) doc.urgencyLevel = clampString(urgencyLevel, LIMITS.shortText.max);
    if (Array.isArray(motorPhotos)) doc.motorPhotos = clampArray(motorPhotos, 20);
    if (status != null && STATUS_VALUES.includes(status)) doc.status = status;

    await doc.save();
    return NextResponse.json({ ok: true, lead: toLeadResponse(doc) });
  } catch (err) {
    console.error("Dashboard update lead error:", err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
