import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { hashPassword } from "@/lib/auth-portal";
import { applyListingOnlySubscriptionToShop } from "@/lib/subscription-service";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";
import { generateUniqueListingUrlSlug } from "@/lib/listing-url-slug";
import { ensureLocationPageForArea } from "@/lib/location-pages-public";
import { notifyAreaRequestsForListing } from "@/lib/notify-area-when-listed";
import { sendShopListedNotificationToAdmin } from "@/lib/email";
import { sendListingFeaturedAccountEmail } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const STR = (v, max = LIMITS.shortText.max) => clampString(v, max);
const URL_MAX = LIMITS.url.max;

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const password =
      typeof body?.password === "string" && body.password.length >= LIMITS.password.min
        ? body.password
        : null;

    if (!password || password.length > LIMITS.password.max) {
      return NextResponse.json(
        { error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.` },
        { status: 400 }
      );
    }

    const {
      email,
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

    if (!email || !companyName) {
      return NextResponse.json({ error: "Email and company name are required." }, { status: 400 });
    }
    const emailNorm = email.trim().toLowerCase().slice(0, LIMITS.email.max);
    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: emailNorm }).select("_id").lean();
    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "A portal account with this email already exists. Use Registered clients or link an existing listing manually.",
          code: "USER_EXISTS",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const shopName = STR(companyName, LIMITS.companyName.max);
    const contactName = STR(primaryContactPerson, LIMITS.name.max);

    let user;
    try {
      user = await User.create({
        email: emailNorm,
        passwordHash,
        shopName,
        contactName,
        canLogin: true,
        listingOnlyAccount: true,
      });
    } catch (createErr) {
      console.error("User create (featured listing):", createErr);
      return NextResponse.json({ error: "Could not create account." }, { status: 500 });
    }

    try {
      await applyListingOnlySubscriptionToShop(user.email);
    } catch (subErr) {
      console.error("Listing-only subscription on featured listing create:", subErr);
    }

    const reviewedAt = new Date();
    const urlSlug = await generateUniqueListingUrlSlug(companyName, null);

    let doc;
    try {
      doc = await Listing.create({
      email: emailNorm,
      companyName: STR(companyName, LIMITS.companyName.max),
      logoUrl: STR(logoUrlBody || "", URL_MAX),
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
      status: "approved",
      submittedAt: reviewedAt,
      reviewedAt,
      reviewedBy: admin,
      isSeed: true,
      urlSlug,
      crmUserId: user._id,
      crmOnboardedAt: reviewedAt,
    });
    } catch (listingErr) {
      console.error("Listing create after user (rollback user):", listingErr);
      try {
        await User.deleteOne({ _id: user._id });
      } catch (_) {}
      return NextResponse.json(
        { error: listingErr.message || "Failed to create listing after account." },
        { status: 500 }
      );
    }

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

    revalidatePath("/electric-motor-reapir-shops-listings");
    const pathSlug = (doc.urlSlug || "").trim();
    if (pathSlug) revalidatePath(`/electric-motor-reapir-shops-listings/${pathSlug}`);

    const site = getPublicSiteUrl();
    const publicListingUrl = pathSlug ? `${site}/electric-motor-reapir-shops-listings/${pathSlug}` : "";

    try {
      await sendListingFeaturedAccountEmail({
        to: user.email,
        shopName: user.shopName || doc.companyName || "",
        userId: String(user._id),
        plainPassword: password,
        publicListingUrl,
      });
    } catch (mailErr) {
      console.error("Featured listing welcome email failed:", mailErr);
    }

    return NextResponse.json({
      ok: true,
      listing: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
        crmUserId: String(user._id),
      },
      user: {
        id: String(user._id),
        email: user.email,
        listingOnlyAccount: true,
      },
    });
  } catch (err) {
    console.error("Admin create featured listing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create listing" },
      { status: 500 }
    );
  }
}
