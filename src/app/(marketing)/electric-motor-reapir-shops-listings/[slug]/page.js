import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicListings, getPublicListingById } from "@/lib/listings-public";
import { getListingReviewStats } from "@/lib/reviews-public";
import { getLocationPageForArea } from "@/lib/location-pages-public";
import { getIdFromSlugParam, getListingSlug } from "@/lib/listing-slug";
import ListingDetailCta from "./listing-detail-cta";
import ListingReviewsSidebar from "./listing-reviews-sidebar";

/** Pre-render all approved listings at build; new ones (approved later) are generated on first visit */
export async function generateStaticParams() {
  const listings = await getPublicListings();
  return listings.map((l) => ({ slug: getListingSlug(l.companyName, l.id) }));
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

export async function generateMetadata({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const id = getIdFromSlugParam(slug);
  const listing = id ? await getPublicListingById(id) : null;
  if (!listing) return { title: "Repair center not found" };
  return {
    title: `${listing.companyName} | Motor Repair Center`,
    description: listing.shortDescription || `Electric motor repair services by ${listing.companyName}.`,
  };
}

export default async function ListingDetailPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const id = getIdFromSlugParam(slug);

  const listing = id ? await getPublicListingById(id) : null;

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

  // Redirect old ID-only URLs to canonical company-name-id URL for SEO
  const canonicalSlug = getListingSlug(listing.companyName, listing.id);
  if (slug && slug.trim() !== canonicalSlug) {
    redirect(`/electric-motor-reapir-shops-listings/${canonicalSlug}`);
  }

  const locationParts = [listing.city, listing.state, listing.zipCode].filter(Boolean);
  const location = locationParts.join(", ");
  const fullAddress = [listing.address, listing.city, listing.state, listing.zipCode, listing.country].filter(Boolean);
  const logoUrl = listing.logoUrl?.trim();
  const gallery = Array.isArray(listing.galleryPhotoUrls) ? listing.galleryPhotoUrls.filter(Boolean) : [];
  const firstGallery = gallery[0];
  const firstGallerySrc = firstGallery?.startsWith("http") ? firstGallery : firstGallery?.startsWith("/") ? firstGallery : firstGallery ? `/${firstGallery}` : null;
  const heroImage = firstGallerySrc || logoUrl;

  const reviewStats = await getListingReviewStats(listing.id);
  const sameAreaPage = await getLocationPageForArea(listing.city, listing.state);
  const sameAreaLabel = [listing.city, listing.state].filter(Boolean).join(", ") || "this area";

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
            <div className="aspect-[21/9] w-full bg-bg">
              <img
                src={heroImage.startsWith("http") ? heroImage : heroImage.startsWith("/") ? heroImage : `/${heroImage}`}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                {logoUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={logoUrl.startsWith("http") ? logoUrl : logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}
                      alt=""
                      className="h-20 w-20 rounded-lg border border-border object-contain bg-bg sm:h-24 sm:w-24"
                    />
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
              <ListingDetailCta listing={listing} />
            </div>

            {listing.shortDescription && (
              <p className="mt-6 text-secondary">{listing.shortDescription}</p>
            )}

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {(listing.website || fullAddress.length > 0 || listing.primaryContactPerson) && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Address & contact</h2>
                  <ul className="mt-3 space-y-1.5 text-sm text-secondary">
                    {listing.primaryContactPerson && (
                      <li>Primary contact: {listing.primaryContactPerson}</li>
                    )}
                    {listing.website && (
                      <li>
                        <a
                          href={listing.website.startsWith("http") ? listing.website : `https://${listing.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Website
                        </a>
                      </li>
                    )}
                    {fullAddress.length > 0 && (
                      <li>{fullAddress.join(", ")}</li>
                    )}
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
                      <img
                        src={logoUrl.startsWith("http") ? logoUrl : logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}
                        alt="Company logo"
                        className="h-28 w-auto max-w-[200px] rounded-lg border border-border object-contain bg-bg p-2 sm:h-32"
                      />
                    </div>
                  )}
                  {gallery.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Gallery</h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {gallery.map((url, i) => (
                          <div key={i} className="aspect-square overflow-hidden rounded-lg bg-bg border border-border">
                            <img
                              src={url.startsWith("http") ? url : url.startsWith("/") ? url : `/${url}`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
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
            <ListingReviewsSidebar listingId={listing.id} />
          </div>
        </div>
      </div>
    </>
  );
}
