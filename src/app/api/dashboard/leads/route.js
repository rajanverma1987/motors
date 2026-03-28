import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { getListingIdsForUser, leadBelongsToShop } from "@/lib/dashboard-leads-scope";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";
import { enrichLeadsForDashboard, maskLeadForListingOnly } from "@/lib/listing-account-restrictions";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const listingIds = await getListingIdsForUser(user.email);
    const all = await Lead.find()
      .sort({ createdAt: -1 })
      .lean();
    const userEmail = user.email.trim().toLowerCase();
    const list = all.filter((doc) => leadBelongsToShop(doc, listingIds, user.email));
    const listWithId = list.map((l) => {
      let source = l.leadSource;
      if (!source) {
        if (l.createdByEmail?.toLowerCase() === userEmail) source = "manual";
        else if (l.sourceListingId && listingIds.includes(l.sourceListingId)) source = "website";
        else source = "admin_assigned";
      }
      return {
        ...l,
        id: l._id.toString(),
        _id: undefined,
        source,
      };
    });
    const { scoped, visibleIds } = await enrichLeadsForDashboard(user.email, listingIds, listWithId);
    const out = scoped.map((l) => maskLeadForListingOnly(l, visibleIds));
    return NextResponse.json(out);
  } catch (err) {
    console.error("Dashboard list leads error:", err);
    return NextResponse.json({ error: "Failed to list leads" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const {
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
    } = body;
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const doc = await Lead.create({
      name: clampString(name, LIMITS.name.max),
      email: email.trim().toLowerCase().slice(0, LIMITS.email.max),
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
      motorPhotos: clampArray(body.motorPhotos, 20),
      leadSource: "manual",
      createdByEmail: user.email.trim().toLowerCase(),
      status: "new",
    });
    return NextResponse.json({
      ok: true,
      lead: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
        source: "manual",
      },
    });
  } catch (err) {
    console.error("Dashboard create lead error:", err);
    return NextResponse.json({ error: err.message || "Failed to create lead" }, { status: 500 });
  }
}
