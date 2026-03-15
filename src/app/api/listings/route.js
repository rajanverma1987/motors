import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function POST(request) {
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

    const doc = await Listing.create({
      email,
      companyName: companyName || "",
      logoUrl: logoUrl || "",
      shortDescription: shortDescription || "",
      yearsInBusiness: yearsInBusiness || "",
      phone: phone || "",
      website: website || "",
      primaryContactPerson: primaryContactPerson || "",
      address: address || "",
      city: city || "",
      state: state || "",
      zipCode: zipCode || "",
      country: country || "United States",
      services: Array.isArray(services) ? services : [],
      maxMotorSizeHP: maxMotorSizeHP || "",
      maxVoltage: maxVoltage || "",
      maxWeightHandled: maxWeightHandled || "",
      motorCapabilities: Array.isArray(motorCapabilities) ? motorCapabilities : [],
      equipmentTesting: Array.isArray(equipmentTesting) ? equipmentTesting : [],
      rewindingCapabilities: Array.isArray(rewindingCapabilities) ? rewindingCapabilities : [],
      industriesServed: Array.isArray(industriesServed) ? industriesServed : [],
      pickupDeliveryAvailable: !!pickupDeliveryAvailable,
      craneCapacity: craneCapacity || "",
      forkliftCapacity: forkliftCapacity || "",
      rushRepairAvailable: !!rushRepairAvailable,
      turnaroundTime: turnaroundTime || "",
      certifications: Array.isArray(certifications) ? certifications : [],
      shopSizeSqft: shopSizeSqft || "",
      numTechnicians: numTechnicians || "",
      numEngineers: numEngineers || "",
      yearsCombinedExperience: yearsCombinedExperience || "",
      galleryPhotoUrls: Array.isArray(galleryPhotoUrls) ? galleryPhotoUrls : [],
      serviceZipCode: serviceZipCode || "",
      serviceRadiusMiles: serviceRadiusMiles || "",
      statesServed: statesServed || "",
      citiesOrMetrosServed: citiesOrMetrosServed || "",
      areaCoveredFrom: areaCoveredFrom || "",
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
