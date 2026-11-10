import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { LIMITS, clampArray, clampString } from "@/lib/validation";
import { saveUploadedListingGalleryFile, saveUploadedLogoFile, sanitizeListingLogoUrlForCreate } from "@/lib/logo-upload";
import {
  computeListingDirectoryScore,
  mergeListingForDirectoryScore,
} from "@/lib/listing-directory-score";
import {
  emailOwnsListing,
  loadApprovedListingBySlug,
  serializeOwnerListing,
} from "@/lib/listing-owner-edit";
import { getListingOwnerEditSession } from "@/lib/listing-owner-edit-auth";

const STR = (v, max = LIMITS.shortText.max) => clampString(String(v ?? ""), max);
const URL_MAX = LIMITS.url.max;
const GALLERY_MAX = 30;
const GALLERY_UPLOAD_MAX = 8;

const ALLOWED_UPDATE_KEYS = [
  "companyName", "shortDescription", "yearsInBusiness", "phone", "website",
  "primaryContactPerson", "address", "city", "state", "zipCode", "country",
  "services", "minMotorSizeHP", "maxMotorSizeHP", "maxVoltage", "maxWeightHandled", "motorCapabilities",
  "equipmentTesting", "rewindingCapabilities", "industriesServed",
  "pickupDeliveryAvailable", "craneCapacity", "forkliftCapacity", "rushRepairAvailable",
  "turnaroundTime", "certifications", "shopSizeSqft", "numTechnicians", "numEngineers",
  "yearsCombinedExperience", "serviceZipCode", "serviceRadiusMiles",
  "statesServed", "citiesOrMetrosServed", "areaCoveredFrom",
];

const NO_STORE = { "Cache-Control": "no-store" };

function strMax(key) {
  if (key === "shortDescription") return 500;
  if (key === "companyName") return LIMITS.companyName.max;
  if (key === "address") return 300;
  if (key === "website") return URL_MAX;
  if (key === "phone") return 30;
  if (key === "city") return LIMITS.city.max;
  if (key === "state") return LIMITS.state.max;
  if (key === "zipCode") return LIMITS.zip.max;
  if (key === "country") return 100;
  if (key === "serviceZipCode") return 20;
  if (key === "statesServed") return 500;
  if (key === "citiesOrMetrosServed") return 1000;
  if (key === "areaCoveredFrom") return 300;
  return LIMITS.shortText.max;
}

async function authorizedListing(request, slug) {
  const session = await getListingOwnerEditSession(request);
  if (!session?.listingId || !session.email) return { error: "Sign in with the code again.", status: 401 };
  const listing = await loadApprovedListingBySlug(slug);
  if (!listing) return { error: "Listing not found.", status: 404 };
  if (String(listing._id) !== session.listingId) {
    return { error: "Sign in with the code again.", status: 401 };
  }
  if (!(await emailOwnsListing(listing, session.email))) {
    return { error: "Sign in with the code again.", status: 401 };
  }
  return { listing };
}

export async function GET(request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") || "";
    const session = await getListingOwnerEditSession(request);
    if (!session?.listingId) {
      return NextResponse.json({ authenticated: false }, { headers: NO_STORE });
    }
    const listing = await loadApprovedListingBySlug(slug);
    if (!listing || String(listing._id) !== session.listingId) {
      return NextResponse.json({ authenticated: false }, { headers: NO_STORE });
    }
    if (!(await emailOwnsListing(listing, session.email))) {
      return NextResponse.json({ authenticated: false }, { headers: NO_STORE });
    }
    return NextResponse.json(
      { authenticated: true, listing: serializeOwnerListing(listing) },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("Listing owner edit GET error:", err);
    return NextResponse.json({ error: "Failed to load listing" }, { status: 500, headers: NO_STORE });
  }
}

export async function PATCH(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }
    const form = await request.formData();
    const dataStr = form.get("data");
    if (!dataStr || typeof dataStr !== "string") {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    let body;
    try {
      body = JSON.parse(dataStr);
    } catch {
      return NextResponse.json({ error: "Invalid JSON in form" }, { status: 400 });
    }

    const slug = String(body?.slug || "").trim();
    const auth = await authorizedListing(request, slug);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const listing = auth.listing;

    const logo = form.get("logo");
    const logoFile = logo && typeof logo.arrayBuffer === "function" && logo.size > 0 ? logo : null;
    let logoUrlFromUpload = null;
    if (logoFile) {
      try {
        logoUrlFromUpload = await saveUploadedLogoFile(logoFile);
      } catch (e) {
        return NextResponse.json({ error: e.message || "Logo upload failed" }, { status: 400 });
      }
    }

    const galleryFiles = form
      .getAll("gallery")
      .filter((file) => file && typeof file.arrayBuffer === "function" && file.size > 0);
    if (galleryFiles.length > GALLERY_UPLOAD_MAX) {
      return NextResponse.json(
        { error: `You can add up to ${GALLERY_UPLOAD_MAX} photos at a time.` },
        { status: 400 }
      );
    }

    const set = {};
    for (const key of ALLOWED_UPDATE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const value = body[key];
      if (
        key === "services" ||
        key === "motorCapabilities" ||
        key === "equipmentTesting" ||
        key === "rewindingCapabilities" ||
        key === "industriesServed" ||
        key === "certifications"
      ) {
        set[key] = clampArray(value);
      } else if (key === "pickupDeliveryAvailable" || key === "rushRepairAvailable") {
        set[key] = !!value;
      } else {
        set[key] = STR(value, strMax(key));
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

    const existingGallery = Array.isArray(listing.galleryPhotoUrls)
      ? listing.galleryPhotoUrls.map((url) => String(url || "")).filter(Boolean)
      : [];
    const remove = new Set(
      Array.isArray(body.removeGalleryUrls) ? body.removeGalleryUrls.map((url) => String(url || "")) : []
    );
    const nextGallery = existingGallery.filter((url) => !remove.has(url));
    if (galleryFiles.length > 0 || remove.size > 0) {
      for (const file of galleryFiles) {
        try {
          nextGallery.push(await saveUploadedListingGalleryFile(file));
        } catch (e) {
          return NextResponse.json({ error: e.message || "Photo upload failed" }, { status: 400 });
        }
      }
      if (nextGallery.length > GALLERY_MAX) {
        return NextResponse.json(
          { error: `A listing can have up to ${GALLERY_MAX} photos.` },
          { status: 400 }
        );
      }
      set.galleryPhotoUrls = nextGallery;
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ ok: true, listing: serializeOwnerListing(listing) }, { headers: NO_STORE });
    }

    const merged = mergeListingForDirectoryScore(listing.toObject(), set);
    set.directoryScore = computeListingDirectoryScore(merged);
    listing.set(set);
    await listing.save();

    const pathSlug = String(listing.urlSlug || "").trim();
    revalidatePath("/electric-motor-repair-shops-listings");
    revalidatePath("/sitemap.xml");
    if (pathSlug) revalidatePath(`/electric-motor-repair-shops-listings/${pathSlug}`);

    return NextResponse.json({ ok: true, listing: serializeOwnerListing(listing) }, { headers: NO_STORE });
  } catch (err) {
    console.error("Listing owner edit PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
