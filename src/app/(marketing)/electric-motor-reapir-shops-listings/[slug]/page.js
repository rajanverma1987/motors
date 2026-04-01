import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicListings, resolvePublicListingFromSlugParam } from "@/lib/listings-public";
import { getListingReviewStats } from "@/lib/reviews-public";
import { getLocationPageForArea } from "@/lib/location-pages-public";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import ListingDetailCta from "./listing-detail-cta";
import ListingReviewsSidebar from "./listing-reviews-sidebar";
import {
  ListingHeroImage,
  ListingInlineLogo,
  ListingLogoImage,
  ListingGalleryThumb,
} from "@/components/listings/listing-optimized-images";

/** Pre-render all approved listings at build; new ones (approved later) are generated on first visit */
export async function generateStaticParams() {
  const listings = await getPublicListings();
  return listings.filter((l) => l.urlSlug).map((l) => ({ slug: l.urlSlug }));
}

/** Allow new slugs not in generateStaticParams (e.g. newly approved) to be generated on demand */
export const dynamicParams = true;

const LABELS = {
  services: "Services",
  motorCapabilities: "Motor capabilities",
  equipmentTesting: "Equipment & testing",
  rewindingCapabilities: "Rewinding",
  industriesServed: "Industries served",
  certifications: "Certifications",
};

const READABLE_OPTION_LABELS = {
  acMotorRepair: "AC Motor Repair",
  dcMotorRepair: "DC Motor Repair",
  motorRewinding: "Motor Rewinding",
  pumpRepair: "Pump Repair",
  generatorRepair: "Generator Repair",
  servoMotorRepair: "Servo Motor Repair",
  spindleRepair: "Spindle Repair",
  vfdRepair: "VFD Repair",
  fieldService: "Field Service",
  emergencyRepair: "Emergency Repair (24/7)",
  onSiteTroubleshooting: "On-site Troubleshooting",
  lowVoltage: "Low Voltage",
  mediumVoltage: "Medium Voltage",
  highVoltage: "High Voltage",
  explosionProof: "Explosion Proof",
  hazardousLocation: "Hazardous Location",
  submersible: "Submersible",
  dynamometer: "Dynamometer",
  surge: "Surge Testing",
  vibration: "Vibration Analysis",
  balancing: "Balancing",
  laserAlignment: "Laser Alignment",
  infrared: "Infrared",
  loadTesting: "Load Testing",
  highVoltageTesting: "High Voltage Testing",
  acMotorRewinding: "AC Motor Rewinding",
  dcArmatureRewinding: "DC Armature Rewinding",
  fieldCoilRewinding: "Field Coil Rewinding",
  coilManufacturing: "Coil Manufacturing",
  vpi: "VPI",
  insulationUpgrades: "Insulation Upgrades",
  manufacturing: "Manufacturing",
  oilGas: "Oil & Gas",
  waterTreatment: "Water Treatment",
  powerPlants: "Power Plants",
  mining: "Mining",
  hvac: "HVAC",
  foodProcessing: "Food Processing",
  agriculture: "Agriculture",
  easaMember: "EASA Member",
  isoCertification: "ISO Certification",
  ulCertified: "UL Certified",
  factoryAuthorizedRepair: "Factory Authorized Repair",
  insuranceCoverage: "Insurance Coverage",
};

function formatListAsReadableArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((item) => READABLE_OPTION_LABELS[item] || item);
}

/** Plain JSON object for Client Components (no ObjectId / BSON / Mongoose toJSON). */
function toClientListingProps(listing) {
  return JSON.parse(JSON.stringify(listing));
}

export async function generateMetadata({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const { listing } = await resolvePublicListingFromSlugParam(slug);
  if (!listing) return { title: "Repair center not found" };
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://motors.example.com").replace(/\/$/, "");
  const canonicalSlug = getListingPublicPathSegment(listing);
  const canonicalUrl = `${siteUrl}/electric-motor-reapir-shops-listings/${canonicalSlug}`;

  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  const zip = String(listing.zipCode || "").trim();
  const locationBits = [city, state, zip].filter(Boolean);
  const locationLabel = locationBits.join(", ");
  const serviceRegionBits = [
    listing.serviceZipCode ? `ZIP ${listing.serviceZipCode}` : "",
    listing.serviceRadiusMiles ? `${listing.serviceRadiusMiles} mile radius` : "",
    listing.statesServed ? String(listing.statesServed) : "",
    listing.citiesOrMetrosServed ? String(listing.citiesOrMetrosServed) : "",
    listing.areaCoveredFrom ? String(listing.areaCoveredFrom) : "",
  ].filter(Boolean);

  const capabilities = [
    ...formatListAsReadableArray(listing.services).slice(0, 6),
    ...formatListAsReadableArray(listing.motorCapabilities).slice(0, 4),
    ...formatListAsReadableArray(listing.rewindingCapabilities).slice(0, 3),
  ];
  const uniqueCaps = [...new Set(capabilities)].slice(0, 8);
  const capabilitiesText = uniqueCaps.length ? uniqueCaps.join(", ") : "";

  const titleParts = [
    listing.companyName,
    locationLabel ? `- Electric Motor Repair in ${locationLabel}` : " - Electric Motor Repair Center",
  ];
  const title = titleParts.join(" ").replace(/\s+/g, " ").trim();

  const descriptionParts = [
    listing.shortDescription ? String(listing.shortDescription).trim() : "",
    capabilitiesText ? `Capabilities: ${capabilitiesText}.` : "",
    serviceRegionBits.length ? `Service region: ${serviceRegionBits.slice(0, 2).join(" · ")}.` : "",
  ].filter(Boolean);
  const description = (descriptionParts.join(" ") || `Electric motor repair services by ${listing.companyName}.`).slice(0, 160);

  const logoUrl = String(listing.logoUrl || "").trim();
  const firstGallery = Array.isArray(listing.galleryPhotoUrls) ? listing.galleryPhotoUrls.find(Boolean) : "";
  const imageCandidate = logoUrl || firstGallery || "";
  const ogImage = imageCandidate
    ? imageCandidate.startsWith("http")
      ? imageCandidate
      : `${siteUrl}${imageCandidate.startsWith("/") ? imageCandidate : `/${imageCandidate}`}`
    : null;

  const keywordSet = new Set([
    "electric motor repair",
    "motor rewinding",
    "industrial motor repair",
    city && `motor repair ${city}`,
    state && `motor rewinding ${state}`,
    ...uniqueCaps.slice(0, 5),
    ...serviceRegionBits.slice(0, 3),
    String(listing.companyName || "").trim(),
  ].filter(Boolean));

  return {
    title,
    description,
    keywords: [...keywordSet],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ListingDetailPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const { listing, redirectToSlug } = await resolvePublicListingFromSlugParam(slug);

  if (redirectToSlug) {
    redirect(`/electric-motor-reapir-shops-listings/${redirectToSlug}`);
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-secondary">Repair center not found.</p>
        <Link href="/electric-motor-reapir-shops-listings" className="mt-4 inline-block text-primary hover:underline">
          ← Back to listings
        </Link>
      </div>
    );
  }

  const canonicalSlug = getListingPublicPathSegment(listing);
  if (slug && canonicalSlug && slug.trim() !== canonicalSlug) {
    redirect(`/electric-motor-reapir-shops-listings/${canonicalSlug}`);
  }

  const locationParts = [listing.city, listing.state, listing.zipCode].filter(Boolean);
  const location = locationParts.join(", ");
  const fullAddress = [listing.address, listing.city, listing.state, listing.zipCode, listing.country].filter(Boolean);
  const logoUrl = listing.logoUrl?.trim();
  const gallery = Array.isArray(listing.galleryPhotoUrls) ? listing.galleryPhotoUrls.filter(Boolean) : [];
  const firstGallery = gallery[0];
  const firstGallerySrc = firstGallery?.startsWith("http") ? firstGallery : firstGallery?.startsWith("/") ? firstGallery : firstGallery ? `/${firstGallery}` : null;
  /** Wide hero only for gallery photos — not the logo (logo stays compact next to the title). */
  const heroImage = firstGallerySrc;

  const reviewStats = await getListingReviewStats(listing.id);
  const sameAreaPage = await getLocationPageForArea(listing.city, listing.state);
  const sameAreaLabel = [listing.city, listing.state].filter(Boolean).join(", ") || "this area";

  const listingForClient = toClientListingProps(listing);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <Link
          href="/electric-motor-reapir-shops-listings"
          className="inline-flex items-center text-sm text-secondary hover:text-primary"
        >
          ← Back to listings
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10 lg:items-start">
          <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {heroImage && (
            <div className="relative aspect-[21/9] w-full bg-muted/30">
              <ListingHeroImage src={heroImage} />
            </div>
          )}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                {logoUrl && (
                  <div className="shrink-0">
                    <ListingInlineLogo src={logoUrl} />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
                    {listing.companyName}
                  </h1>
                  {reviewStats.count > 0 && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary">
                      <span className="font-medium text-title">{reviewStats.average.toFixed(1)}</span>
                      <span aria-hidden>★</span>
                      <span>({reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""})</span>
                    </p>
                  )}
                  {location && (
                    <p className="mt-1 text-secondary">{location}</p>
                  )}
                  {listing.country && listing.country !== "United States" && (
                    <p className="text-sm text-secondary">{listing.country}</p>
                  )}
                  {listing.yearsInBusiness && (
                    <p className="mt-0.5 text-sm text-secondary">
                      {listing.yearsInBusiness} years in business
                    </p>
                  )}
                </div>
              </div>
              <ListingDetailCta listing={listingForClient} />
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/25 px-4 py-3 sm:px-5">
              <p className="text-sm text-secondary">
                <span className="font-medium text-title">Is this your business?</span>{" "}
                Sign in to your MotorsWinding account to update this directory listing—services, service area, photos,
                and contact details—whenever they change.{" "}
                <Link
                  href={`/login?next=${encodeURIComponent("/dashboard/directory-listing")}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Sign in to edit your listing
                </Link>
                .
              </p>
            </div>

            {listing.shortDescription && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold tracking-wide text-title">About us</h2>
                <p className="mt-3 text-sm text-secondary">{listing.shortDescription}</p>
              </div>
            )}

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {fullAddress.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Address</h2>
                  <ul className="mt-3 space-y-1.5 text-sm text-secondary">
                    <li>{fullAddress.join(", ")}</li>
                  </ul>
                </div>
              )}

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Capabilities</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-secondary">
                  {listing.maxMotorSizeHP && (
                    <li>Max motor size: {listing.maxMotorSizeHP} HP</li>
                  )}
                  {listing.maxVoltage && (
                    <li>Max voltage: {listing.maxVoltage}</li>
                  )}
                  {listing.maxWeightHandled && (
                    <li>Max weight handled: {listing.maxWeightHandled}</li>
                  )}
                  {listing.turnaroundTime && (
                    <li>Turnaround: {listing.turnaroundTime}</li>
                  )}
                  {listing.pickupDeliveryAvailable && (
                    <li>Pickup & delivery available</li>
                  )}
                  {listing.rushRepairAvailable && (
                    <li>Rush repair available</li>
                  )}
                  {listing.craneCapacity && (
                    <li>Crane capacity: {listing.craneCapacity}</li>
                  )}
                  {listing.forkliftCapacity && (
                    <li>Forklift capacity: {listing.forkliftCapacity}</li>
                  )}
                </ul>
              </div>
            </div>

            {(listing.shopSizeSqft || listing.numTechnicians || listing.numEngineers || listing.yearsCombinedExperience) && (
              <div className="mt-8 border-t border-border pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Shop facilities</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-secondary">
                  {listing.shopSizeSqft && (
                    <li>Shop size: {listing.shopSizeSqft} sq ft</li>
                  )}
                  {listing.numTechnicians && (
                    <li>Technicians: {listing.numTechnicians}</li>
                  )}
                  {listing.numEngineers && (
                    <li>Engineers: {listing.numEngineers}</li>
                  )}
                  {listing.yearsCombinedExperience && (
                    <li>Years combined experience: {listing.yearsCombinedExperience}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-8 sm:grid-cols-3">
              {["services", "motorCapabilities", "equipmentTesting", "rewindingCapabilities", "industriesServed", "certifications"].map((key) => {
                const items = formatListAsReadableArray(listing[key]);
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                      {LABELS[key]}
                    </h3>
                    <ul className="mt-1.5 space-y-0.5 text-sm text-title">
                      {items.map((label, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <svg className="h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {(listing.serviceZipCode || listing.serviceRadiusMiles || listing.statesServed || listing.citiesOrMetrosServed || listing.areaCoveredFrom) && (
              <div className="mt-6 border-t border-border pt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Service region</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-secondary">
                  {listing.serviceZipCode && (
                    <li>Service ZIP: {listing.serviceZipCode}</li>
                  )}
                  {listing.serviceRadiusMiles && (
                    <li>Service radius: {listing.serviceRadiusMiles} miles</li>
                  )}
                  {listing.statesServed && (
                    <li>States served: {listing.statesServed}</li>
                  )}
                  {listing.citiesOrMetrosServed && (
                    <li>Cities / metros: {listing.citiesOrMetrosServed}</li>
                  )}
                  {listing.areaCoveredFrom && (
                    <li className="text-title">{listing.areaCoveredFrom}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="mt-8 border-t border-border pt-8">
              <p className="text-sm text-secondary">
                Find more shops in the same area:{" "}
                {sameAreaPage ? (
                  <Link
                    href={`/motor-repair-shop/${sameAreaPage.slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {sameAreaPage.title}
                  </Link>
                ) : (
                  <Link
                    href={`/electric-motor-reapir-shops-listings?${new URLSearchParams({
                      ...(listing.city && { city: listing.city }),
                      ...(listing.state && { state: listing.state }),
                    }).toString()}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Browse repair centers in {sameAreaLabel}
                  </Link>
                )}
              </p>
            </div>

            {(logoUrl || gallery.length > 0) && (
              <div className="mt-8 border-t border-border pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Logo & gallery</h2>
                <div className="mt-4 flex flex-col gap-6">
                  {logoUrl && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Company logo</h3>
                      <ListingLogoImage src={logoUrl} alt="Company logo" />
                    </div>
                  )}
                  {gallery.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Gallery</h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {gallery.map((url, i) => (
                          <div
                            key={i}
                            className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
                          >
                            <ListingGalleryThumb src={url} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
          </div>
          <div className="lg:sticky lg:top-8">
            <ListingReviewsSidebar
              listingId={listing.id}
              listingPagePath={`/electric-motor-reapir-shops-listings/${canonicalSlug}`}
            />
          </div>
        </div>
      </div>
    </>
  );
}
