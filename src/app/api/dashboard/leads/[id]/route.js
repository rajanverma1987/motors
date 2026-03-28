import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";
import { getListingIdsForUser, leadBelongsToShop } from "@/lib/dashboard-leads-scope";
import {
  enrichLeadsForDashboard,
  maskLeadForListingOnly,
  userIsListingOnlyAccount,
} from "@/lib/listing-account-restrictions";

const STATUS_VALUES = ["new", "contacted", "quoted", "won", "lost"];

function buildLeadRow(l, userEmail, listingIds) {
  const em = (userEmail || "").trim().toLowerCase();
  let source = l.leadSource;
  if (!source) {
    if (l.createdByEmail?.toLowerCase() === em) source = "manual";
    else if (l.sourceListingId && listingIds.includes(l.sourceListingId)) source = "website";
    else source = "admin_assigned";
  }
  return {
    ...l,
    id: l._id.toString(),
    _id: undefined,
    source,
  };
}

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
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
    const listWithId = [buildLeadRow(doc, user.email, listingIds)];
    const { scoped, visibleIds } = await enrichLeadsForDashboard(user.email, listingIds, listWithId);
    const row = scoped.find((l) => l.id === id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(maskLeadForListingOnly(row, visibleIds));
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
    const all = await Lead.find().sort({ createdAt: -1 }).lean();
    const shopLeads = all.filter((d) => leadBelongsToShop(d, listingIds, user.email));
    const listWithId = shopLeads.map((l) => buildLeadRow(l, user.email, listingIds));
    const { scoped, visibleIds } = await enrichLeadsForDashboard(user.email, listingIds, listWithId);
    const row = scoped.find((l) => l.id === id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const contactMasked = (await userIsListingOnlyAccount(user.email)) && !visibleIds.has(id);

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

    if (contactMasked) {
      const touched = [
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
      ].some((v) => v !== undefined);
      if (touched) {
        return NextResponse.json(
          {
            error:
              "Contact details are hidden for this lead on the directory listing plan. Upgrade to edit full lead information.",
            code: "LISTING_ONLY_MASKED",
          },
          { status: 403 }
        );
      }
    }

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
    const fresh = await Lead.findById(id).lean();
    const listRow = [buildLeadRow(fresh, user.email, listingIds)];
    const enriched = await enrichLeadsForDashboard(user.email, listingIds, listRow);
    const outRow = enriched.scoped.find((l) => l.id === id);
    if (!outRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      lead: maskLeadForListingOnly(outRow, enriched.visibleIds),
    });
  } catch (err) {
    console.error("Dashboard update lead error:", err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
