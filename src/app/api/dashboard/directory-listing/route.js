import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";
import { sendNewListingSubmittedToAdmin } from "@/lib/email";
import { applyListingOnlySubscriptionToShop } from "@/lib/subscription-service";
import { saveUploadedLogoFile, sanitizeListingLogoUrlForCreate } from "@/lib/logo-upload";
import {
  computeListingDirectoryScore,
  mergeListingForDirectoryScore,
} from "@/lib/listing-directory-score";

const STR = (v, max = LIMITS.shortText.max) => clampString(v, max);
const URL_MAX = LIMITS.url.max;

const ALLOWED_UPDATE_KEYS = [
  "companyName", "logoUrl", "shortDescription", "yearsInBusiness", "phone", "website",
  "primaryContactPerson", "address", "city", "state", "zipCode", "country",
  "services", "maxMotorSizeHP", "maxVoltage", "maxWeightHandled", "motorCapabilities",
  "equipmentTesting", "rewindingCapabilities", "industriesServed",
  "pickupDeliveryAvailable", "craneCapacity", "forkliftCapacity", "rushRepairAvailable",
  "turnaroundTime", "certifications", "shopSizeSqft", "numTechnicians", "numEngineers",
  "yearsCombinedExperience", "serviceZipCode", "serviceRadiusMiles",
  "statesServed", "citiesOrMetrosServed", "areaCoveredFrom",
];

function serializeListing(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    ...o,
    id: o._id?.toString?.() ?? o.id,
    _id: undefined,
  };
}

async function parseMultipartListingRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return { error: "Expected multipart/form-data", body: null, logoFile: null };
  }
  const form = await request.formData();
  const dataStr = form.get("data");
  if (!dataStr || typeof dataStr !== "string") {
    return { error: "Invalid form data", body: null, logoFile: null };
  }
  let body;
  try {
    body = JSON.parse(dataStr);
  } catch {
    return { error: "Invalid JSON in form", body: null, logoFile: null };
  }
  const logo = form.get("logo");
  const logoFile =
    logo && typeof logo.arrayBuffer === "function" && logo.size > 0 ? logo : null;
  return { error: null, body, logoFile };
}

/** GET: current user’s directory listing (most recently updated). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await Listing.findOne({ email })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({
      listing: doc ? serializeListing(doc) : null,
      accountEmail: email,
    });
  } catch (err) {
    console.error("GET dashboard directory-listing:", err);
    return NextResponse.json({ error: "Failed to load listing" }, { status: 500 });
  }
}

/** POST: create listing (same as public form); email forced from session. */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const existing = await Listing.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        {
          error: "You already have a directory listing. Save changes to update it.",
          existingId: existing._id.toString(),
        },
        { status: 409 }
      );
    }

    const { error, body, logoFile } = await parseMultipartListingRequest(request);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    let logoUrlFromUpload = null;
    if (logoFile) {
      try {
        logoUrlFromUpload = await saveUploadedLogoFile(logoFile);
      } catch (e) {
        return NextResponse.json(
          { error: e.message || "Logo upload failed" },
          { status: 400 }
        );
      }
    }

    const {
      companyName,
      logoUrl: logoUrlBody,
      shortDescription,
      yearsInBusiness,
      phone,
      website,
      primaryContactPerson,
      address,
      city,
      state,
      zipCode,
      country,
      services,
      maxMotorSizeHP,
      maxVoltage,
      maxWeightHandled,
      motorCapabilities,
      equipmentTesting,
      rewindingCapabilities,
      industriesServed,
      pickupDeliveryAvailable,
      craneCapacity,
      forkliftCapacity,
      rushRepairAvailable,
      turnaroundTime,
      certifications,
      shopSizeSqft,
      numTechnicians,
      numEngineers,
      yearsCombinedExperience,
      galleryPhotoUrls,
      serviceZipCode,
      serviceRadiusMiles,
      statesServed,
      citiesOrMetrosServed,
      areaCoveredFrom,
    } = body;

    if (!companyName) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid account email." }, { status: 400 });
    }

    const logoUrl =
      logoUrlFromUpload != null
        ? logoUrlFromUpload
        : sanitizeListingLogoUrlForCreate(logoUrlBody, URL_MAX);

    const doc = await Listing.create({
      email: email.slice(0, LIMITS.email.max),
      companyName: STR(companyName, LIMITS.companyName.max),
      logoUrl: STR(logoUrl, URL_MAX),
      shortDescription: STR(shortDescription, 500),
      yearsInBusiness: STR(yearsInBusiness),
      phone: STR(phone, 30),
      website: STR(website, URL_MAX),
      primaryContactPerson: STR(primaryContactPerson),
      address: STR(address, 300),
      city: STR(city, LIMITS.city.max),
      state: STR(state, LIMITS.state.max),
      zipCode: STR(zipCode, LIMITS.zip.max),
      country: STR(country, 100) || "United States",
      services: clampArray(services),
      maxMotorSizeHP: STR(maxMotorSizeHP),
      maxVoltage: STR(maxVoltage),
      maxWeightHandled: STR(maxWeightHandled),
      motorCapabilities: clampArray(motorCapabilities),
      equipmentTesting: clampArray(equipmentTesting),
      rewindingCapabilities: clampArray(rewindingCapabilities),
      industriesServed: clampArray(industriesServed),
      pickupDeliveryAvailable: !!pickupDeliveryAvailable,
      craneCapacity: STR(craneCapacity),
      forkliftCapacity: STR(forkliftCapacity),
      rushRepairAvailable: !!rushRepairAvailable,
      turnaroundTime: STR(turnaroundTime),
      certifications: clampArray(certifications),
      shopSizeSqft: STR(shopSizeSqft),
      numTechnicians: STR(numTechnicians),
      numEngineers: STR(numEngineers),
      yearsCombinedExperience: STR(yearsCombinedExperience),
      galleryPhotoUrls: clampArray(galleryPhotoUrls, 30).map((u) => STR(u, URL_MAX)),
      serviceZipCode: STR(serviceZipCode, 20),
      serviceRadiusMiles: STR(serviceRadiusMiles),
      statesServed: STR(statesServed, 500),
      citiesOrMetrosServed: STR(citiesOrMetrosServed, 1000),
      areaCoveredFrom: STR(areaCoveredFrom, 300),
      status: "in-review",
    });

    try {
      await sendNewListingSubmittedToAdmin(doc);
    } catch (e) {
      console.warn("New listing notification email failed:", e);
    }

    try {
      await applyListingOnlySubscriptionToShop(email);
    } catch (e) {
      console.warn("applyListingOnlySubscriptionToShop (dashboard new listing):", e);
    }

    return NextResponse.json({ ok: true, listing: serializeListing(doc.toObject()) });
  } catch (err) {
    console.error("POST dashboard directory-listing:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create listing" },
      { status: 500 }
    );
  }
}

/** PATCH: update owned listing (id in JSON body). */
export async function PATCH(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = user.email.trim().toLowerCase();

    const { error, body, logoFile } = await parseMultipartListingRequest(request);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const id = body?.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Listing id required" }, { status: 400 });
    }

    await connectDB();
    const doc = await Listing.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ((doc.email || "").trim().toLowerCase() !== userEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let logoUrlFromUpload = null;
    if (logoFile) {
      try {
        logoUrlFromUpload = await saveUploadedLogoFile(logoFile);
      } catch (e) {
        return NextResponse.json(
          { error: e.message || "Logo upload failed" },
          { status: 400 }
        );
      }
    }

    const strMax = (k) => {
      if (k === "shortDescription") return 500;
      if (k === "companyName") return LIMITS.companyName.max;
      if (k === "address") return 300;
      if (k === "website") return URL_MAX;
      if (k === "phone") return 30;
      if (k === "city") return LIMITS.city.max;
      if (k === "state") return LIMITS.state.max;
      if (k === "zipCode") return LIMITS.zip.max;
      if (k === "country") return 100;
      if (k === "serviceZipCode") return 20;
      if (k === "statesServed") return 500;
      if (k === "citiesOrMetrosServed") return 1000;
      if (k === "areaCoveredFrom") return 300;
      return LIMITS.shortText.max;
    };

    const set = {};
    for (const key of ALLOWED_UPDATE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      if (key === "logoUrl") continue;
      const v = body[key];
      if (key === "services" || key === "motorCapabilities" || key === "equipmentTesting"
        || key === "rewindingCapabilities" || key === "industriesServed" || key === "certifications") {
        set[key] = clampArray(v);
      } else if (key === "pickupDeliveryAvailable" || key === "rushRepairAvailable") {
        set[key] = !!v;
      } else {
        set[key] = STR(String(v ?? ""), strMax(key));
      }
    }

    if (Object.prototype.hasOwnProperty.call(set, "companyName") && !String(set.companyName || "").trim()) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }

    if (logoUrlFromUpload != null) {
      set.logoUrl = STR(logoUrlFromUpload, URL_MAX);
    } else if (Object.prototype.hasOwnProperty.call(body, "logoUrl")) {
      const sanitized = sanitizeListingLogoUrlForCreate(body.logoUrl, URL_MAX);
      if (sanitized) set.logoUrl = sanitized;
    }

    if (Object.keys(set).length === 0) {
      const current = await Listing.findById(id).lean();
      return NextResponse.json({ ok: true, listing: serializeListing(current) });
    }

    const existing = await Listing.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const merged = mergeListingForDirectoryScore(existing, set);
    set.directoryScore = computeListingDirectoryScore(merged);

    const saved = await Listing.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true }
    ).lean();

    revalidatePath("/electric-motor-reapir-shops-listings");
    revalidatePath("/sitemap.xml");
    const pathSlug = (saved.urlSlug || "").trim();
    if (pathSlug) revalidatePath(`/electric-motor-reapir-shops-listings/${pathSlug}`);

    return NextResponse.json({ ok: true, listing: serializeListing(saved) });
  } catch (err) {
    console.error("PATCH dashboard directory-listing:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update" },
      { status: 500 }
    );
  }
}
