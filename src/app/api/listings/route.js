import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";

const STR = (v, max = LIMITS.shortText.max) => clampString(v, max);
const URL_MAX = LIMITS.url.max;

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "listing-submit", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }
  try {
    await connectDB();
    const body = await request.json();
    const {
      email,
      companyName,
      logoUrl,
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

    if (!email || !companyName) {
      return NextResponse.json(
        { error: "Email and company name required" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const doc = await Listing.create({
      email: (email.trim().toLowerCase()).slice(0, LIMITS.email.max),
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

    return NextResponse.json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    console.error("Create listing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create listing" },
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    let q = {};
    if (status === "in-review") {
      q = { status: { $in: ["in-review", "pending"] } };
    } else if (status === "approved" || status === "rejected") {
      q = { status };
    }
    const list = await Listing.find(q).sort({ submittedAt: -1 }).lean();
    const listWithId = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("List listings error:", err);
    return NextResponse.json(
      { error: "Failed to list" },
      { status: 500 }
    );
  }
}
