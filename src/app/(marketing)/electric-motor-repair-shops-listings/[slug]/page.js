import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicListings, resolvePublicListingFromSlugParam } from "@/lib/listings-public";
import { getListingReviewStats } from "@/lib/reviews-public";
import { getLocationPageForArea } from "@/lib/location-pages-public";
import { getListingPublicPathSegment, isListingUrlSlugExportSafe } from "@/lib/listing-slug";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  buildListingDetailFaqs,
  buildListingDetailJsonLdGraph,
  buildListingDetailTitle,
  buildListingDetailH1,
  buildListingDetailDescription,
  formatListingOptionLabels,
  listingAssetAbsoluteUrl,
  listingIndustryItems,
  listingNearbyCityLinks,
  listingModifiedIso,
  listingOffersEmergency,
} from "@/lib/listing-detail-seo";
import { LISTINGS_FORM_STICKY, LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import ListingDetailCta from "./listing-detail-cta";
import ListingReviewsSidebar from "./listing-reviews-sidebar";
import ListingDetailFaqSection from "./listing-detail-faq-section";
import OwnAShopLikeThisModule from "@/components/marketing/OwnAShopLikeThisModule";
import ListingGalleryLightbox from "./listing-gallery-lightbox";
import ListingPageViewTracker from "@/components/listings/listing-page-view-tracker";
import ContactReveal from "@/components/marketing/contact-reveal";
import { ListingHeroImage, ListingInlineLogo, ListingLogoImage } from "@/components/listings/listing-optimized-images";

/** Pre-render all approved listings at build; new ones (approved later) are generated on first visit */
export async function generateStaticParams() {
  const listings = await getPublicListings();
  return listings
    .filter((l) => l.urlSlug && isListingUrlSlugExportSafe(l.urlSlug))
    .map((l) => ({ slug: l.urlSlug }));
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

/** Plain JSON object for Client Components (no ObjectId / BSON / Mongoose toJSON). */
function toClientListingProps(listing) {
  return JSON.parse(JSON.stringify(listing));
}

export async function generateMetadata({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const { listing } = await resolvePublicListingFromSlugParam(slug);
  if (!listing) {
    return {
      title: "Repair center not found",
      robots: { index: false, follow: true },
    };
  }
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const canonicalSlug = getListingPublicPathSegment(listing);
  const canonicalUrl = `${siteUrl}/electric-motor-repair-shops-listings/${canonicalSlug}`;

  const serviceLabels = formatListingOptionLabels(listing.services);
  const title = buildListingDetailTitle(listing);
  const description = buildListingDetailDescription(listing, serviceLabels);
  const modified = listingModifiedIso(listing);

  const logoUrl = String(listing.logoUrl || "").trim();
  const firstGallery = Array.isArray(listing.galleryPhotoUrls)
    ? listing.galleryPhotoUrls.find(Boolean)
    : "";
  const imageCandidate = logoUrl || firstGallery || "";
  const ogImage = imageCandidate ? listingAssetAbsoluteUrl(siteUrl, imageCandidate) : null;

  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  const keywordSet = new Set(
    [
      "electric motor repair",
      "motor rewinding",
      "industrial motor repair",
      city && `motor repair ${city}`,
      state && `motor rewinding ${state}`,
      ...serviceLabels.slice(0, 5),
      String(listing.companyName || "").trim(),
    ].filter(Boolean)
  );

  return {
    title,
    description,
    keywords: [...keywordSet],
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "IQMotorBase.com",
      locale: "en_US",
      images: ogImage
        ? [{ url: ogImage, alt: `${listing.companyName} — electric motor repair` }]
        : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    other: {
      "article:modified_time": modified,
    },
  };
}

export default async function ListingDetailPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const { listing, redirectToSlug } = await resolvePublicListingFromSlugParam(slug);

  if (redirectToSlug) {
    redirect(`/electric-motor-repair-shops-listings/${redirectToSlug}`);
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-[67.2rem] px-4 py-16 text-center">
        <p className="text-secondary">Repair center not found.</p>
        <Link
          href="/electric-motor-repair-shops-listings"
          prefetch
          className="mt-4 inline-block text-primary hover:underline"
        >
          ← Back to listings
        </Link>
      </div>
    );
  }

  const canonicalSlug = getListingPublicPathSegment(listing);
  if (slug && canonicalSlug && slug.trim() !== canonicalSlug) {
    redirect(`/electric-motor-repair-shops-listings/${canonicalSlug}`);
  }

  const locationParts = [listing.city, listing.state, listing.zipCode].filter(Boolean);
  const location = locationParts.join(", ");
  const fullAddress = [
    listing.address,
    listing.city,
    listing.state,
    listing.zipCode,
    listing.country,
  ].filter(Boolean);
  const logoUrl = listing.logoUrl?.trim();
  const gallery = Array.isArray(listing.galleryPhotoUrls)
    ? listing.galleryPhotoUrls.filter(Boolean)
    : [];
  const firstGallery = gallery[0];
  const firstGallerySrc = firstGallery?.startsWith("http")
    ? firstGallery
    : firstGallery?.startsWith("/")
      ? firstGallery
      : firstGallery
        ? `/${firstGallery}`
        : null;
  const heroImage = firstGallerySrc;

  const reviewStats = await getListingReviewStats(listing.id);
  const sameAreaPage = await getLocationPageForArea(listing.city, listing.state);
  const sameAreaLabel = [listing.city, listing.state].filter(Boolean).join(", ") || "this area";
  const sameAreaHref = sameAreaPage
    ? `/motor-repair-shop/${sameAreaPage.slug}`
    : `/electric-motor-repair-shops-listings?${new URLSearchParams({
        ...(listing.city && { city: listing.city }),
        ...(listing.state && { state: listing.state }),
      }).toString()}`;

  const listingForClient = toClientListingProps(listing);
  const emergency = listingOffersEmergency(listing);
  const industryItems = listingIndustryItems(listing.industriesServed);
  const nearbyLinks = listingNearbyCityLinks(listing);
  const modifiedIso = listingModifiedIso(listing);
  const modifiedLabel = (() => {
    const d = new Date(modifiedIso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  })();

  const serviceBits = [
    ...formatListingOptionLabels(listing.services),
    ...formatListingOptionLabels(listing.motorCapabilities),
    ...formatListingOptionLabels(listing.equipmentTesting).slice(0, 4),
  ].filter(Boolean);
  const servicesPreview = [...new Set(serviceBits)].slice(0, 18).join(", ");

  const regionParts = [
    listing.serviceRadiusMiles && `${String(listing.serviceRadiusMiles).trim()}-mile service radius`,
    listing.statesServed && String(listing.statesServed).trim(),
    listing.citiesOrMetrosServed && String(listing.citiesOrMetrosServed).trim(),
    listing.areaCoveredFrom && String(listing.areaCoveredFrom).trim(),
    listing.serviceZipCode && `ZIP ${String(listing.serviceZipCode).trim()}`,
  ].filter(Boolean);
  const companyNameTrim = String(listing.companyName || "This shop").trim();
  const regionLine = regionParts.length
    ? `${companyNameTrim} serves customers across ${regionParts.slice(0, 5).join("; ")}.`
    : "";

  const addressLine = fullAddress.length ? fullAddress.join(", ") : "";
  const h1 = buildListingDetailH1(listing);

  const siteBase = getPublicSiteUrl().replace(/\/$/, "");
  const faqs = buildListingDetailFaqs(
    listing,
    {
      locationLine: location,
      addressLine,
      servicesPreview,
      regionLine,
    },
    siteBase
  );

  const pageCanonicalUrl = `${siteBase}/electric-motor-repair-shops-listings/${canonicalSlug}`;
  const jsonLd = buildListingDetailJsonLdGraph({
    listing,
    canonicalUrl: pageCanonicalUrl,
    siteBase,
    reviewStats,
    faqs,
    sameAreaHref,
    sameAreaLabel: sameAreaPage ? sameAreaPage.title || sameAreaLabel : sameAreaLabel,
  });

  return (
    <>
      <ListingPageViewTracker listingId={listing.id} />
      <script
        id="listing-directory-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className={`${LISTINGS_PAGE_CONTAINER} py-8 sm:py-12`}>
        <nav aria-label="Breadcrumb" className="text-sm text-secondary">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" prefetch className="hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link
                href="/electric-motor-repair-shops-listings"
                prefetch
                className="hover:text-primary"
              >
                Motor Repair Shops
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href={sameAreaHref} prefetch className="hover:text-primary">
                {sameAreaLabel}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="text-title" aria-current="page">
              {listing.companyName}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_352px] lg:items-start">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {heroImage && (
                <div className="relative aspect-[21/9] w-full bg-muted/30">
                  <ListingHeroImage
                    src={heroImage}
                    alt={`${listing.companyName} — shop facility, ${sameAreaLabel}`}
                  />
                </div>
              )}
              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                  {logoUrl && (
                    <div className="shrink-0">
                      <ListingInlineLogo
                        src={logoUrl}
                        alt={`${listing.companyName} logo — electric motor repair`}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
                      {h1}
                    </h1>
                    {reviewStats.count > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary">
                        <span className="font-medium text-title">
                          {reviewStats.average.toFixed(1)}
                        </span>
                        <span aria-hidden>★</span>
                        <span>
                          ({reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""})
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-xs text-secondary sm:gap-3 sm:px-4 sm:text-sm">
                  {location ? <span>{location}</span> : null}
                  {listing.yearsInBusiness ? (
                    <span>{listing.yearsInBusiness} years in business</span>
                  ) : null}
                  {listing.maxMotorSizeHP ? (
                    <span>Up to {listing.maxMotorSizeHP} HP</span>
                  ) : null}
                  {emergency ? (
                    <span className="font-semibold text-danger">24/7 Emergency</span>
                  ) : null}
                  {listing.pickupDeliveryAvailable ? (
                    <span>Pickup &amp; delivery</span>
                  ) : null}
                </div>

                <div className="mt-6 rounded-lg border border-border bg-muted/25 px-4 py-3 sm:px-5">
                  <p className="text-sm text-secondary">
                    <span className="font-medium text-title">Is this your business?</span> Sign
                    in to your IQMotorBase account to update this directory listing—services,
                    service area, photos, and contact details—whenever they change.{" "}
                    <Link
                      href={`/login?next=${encodeURIComponent("/dashboards/settings?section=directory-listing")}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Sign in to edit your listing
                    </Link>
                    .
                  </p>
                </div>

                {listing.shortDescription && (
                  <div className="mt-8">
                    <h2 className="text-sm font-semibold tracking-wide text-title">
                      About {listing.companyName}
                    </h2>
                    <p className="mt-3 text-sm text-secondary">{listing.shortDescription}</p>
                    {modifiedLabel ? (
                      <p className="mt-2 text-xs text-secondary/80">
                        Listing last updated: {modifiedLabel}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  {(fullAddress.length > 0 || listing.phone || listing.email || listing.website) && (
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                        Location &amp; contact
                      </h2>
                      {fullAddress.length > 0 ? (
                        <address className="listing-address mt-3 not-italic text-sm text-secondary">
                          {listing.companyName}
                          <br />
                          {listing.address ? (
                            <>
                              {listing.address}
                              <br />
                            </>
                          ) : null}
                          {[listing.city, listing.state, listing.zipCode]
                            .filter(Boolean)
                            .join(", ")}
                          <br />
                          {listing.country || "United States"}
                        </address>
                      ) : null}

                      {/* Hidden contact data for Google crawlers — keep in HTML */}
                      <div className="contact-seo-hidden" aria-hidden="true">
                        {listing.phone ? (
                          <a
                            href={`tel:${String(listing.phone).replace(/\D/g, "")}`}
                            className="seo-phone"
                          >
                            {listing.phone}
                          </a>
                        ) : null}
                        {listing.email ? (
                          <a href={`mailto:${listing.email}`} className="seo-email">
                            {listing.email}
                          </a>
                        ) : null}
                        {listing.website ? (
                          <a href={listing.website} className="seo-website">
                            {listing.website}
                          </a>
                        ) : null}
                      </div>

                      <ContactReveal
                        shopId={listing.id}
                        shopSlug={canonicalSlug}
                        shopName={listing.companyName}
                        shopCity={listing.city || ""}
                        shopState={listing.state || ""}
                        phone={listing.phone || ""}
                        email={listing.email || ""}
                        website={listing.website || ""}
                        address={addressLine}
                        listing={listingForClient}
                      />
                    </div>
                  )}

                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                      Capabilities
                    </h2>
                    <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
                      {listing.maxMotorSizeHP ? (
                        <>
                          <dt className="text-secondary">Max motor size</dt>
                          <dd className="text-title">{listing.maxMotorSizeHP} HP</dd>
                        </>
                      ) : null}
                      {listing.maxVoltage ? (
                        <>
                          <dt className="text-secondary">Max voltage</dt>
                          <dd className="text-title">{listing.maxVoltage}</dd>
                        </>
                      ) : null}
                      {listing.maxWeightHandled ? (
                        <>
                          <dt className="text-secondary">Max weight handled</dt>
                          <dd className="text-title">{listing.maxWeightHandled}</dd>
                        </>
                      ) : null}
                      {listing.turnaroundTime ? (
                        <>
                          <dt className="text-secondary">Turnaround</dt>
                          <dd className="text-title">{listing.turnaroundTime}</dd>
                        </>
                      ) : null}
                      {listing.pickupDeliveryAvailable ? (
                        <>
                          <dt className="text-secondary">Pickup &amp; delivery</dt>
                          <dd className="text-title">Available</dd>
                        </>
                      ) : null}
                      {listing.rushRepairAvailable ? (
                        <>
                          <dt className="text-secondary">Rush repair</dt>
                          <dd className="text-title">Available</dd>
                        </>
                      ) : null}
                      {listing.craneCapacity ? (
                        <>
                          <dt className="text-secondary">Crane capacity</dt>
                          <dd className="text-title">{listing.craneCapacity}</dd>
                        </>
                      ) : null}
                      {listing.forkliftCapacity ? (
                        <>
                          <dt className="text-secondary">Forklift capacity</dt>
                          <dd className="text-title">{listing.forkliftCapacity}</dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                </div>

                {(listing.shopSizeSqft ||
                  listing.numTechnicians ||
                  listing.numEngineers ||
                  listing.yearsCombinedExperience) && (
                  <div className="mt-8 border-t border-border pt-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                      Shop facilities
                    </h2>
                    <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
                      {listing.shopSizeSqft ? (
                        <>
                          <dt className="text-secondary">Shop size</dt>
                          <dd className="text-title">{listing.shopSizeSqft} sq ft</dd>
                        </>
                      ) : null}
                      {listing.numTechnicians ? (
                        <>
                          <dt className="text-secondary">Technicians</dt>
                          <dd className="text-title">{listing.numTechnicians}</dd>
                        </>
                      ) : null}
                      {listing.numEngineers ? (
                        <>
                          <dt className="text-secondary">Engineers</dt>
                          <dd className="text-title">{listing.numEngineers}</dd>
                        </>
                      ) : null}
                      {listing.yearsCombinedExperience ? (
                        <>
                          <dt className="text-secondary">Combined experience</dt>
                          <dd className="text-title">
                            {listing.yearsCombinedExperience} years
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                )}

                <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-8 sm:grid-cols-3">
                  {[
                    "services",
                    "motorCapabilities",
                    "equipmentTesting",
                    "rewindingCapabilities",
                    "certifications",
                  ].map((key) => {
                    const items = formatListingOptionLabels(listing[key]);
                    if (items.length === 0) return null;
                    return (
                      <div key={key}>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          {LABELS[key]}
                        </h3>
                        <ul className="mt-1.5 space-y-0.5 text-sm text-title">
                          {items.map((label, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 shrink-0 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {industryItems.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                        {LABELS.industriesServed}
                      </h3>
                      <ul className="mt-1.5 space-y-0.5 text-sm text-title">
                        {industryItems.map((item) => (
                          <li key={item.label} className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 shrink-0 text-primary"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {item.href ? (
                              <Link
                                href={item.href}
                                prefetch
                                className="text-primary hover:underline"
                              >
                                {item.label}
                              </Link>
                            ) : (
                              item.label
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {(listing.serviceZipCode ||
                  listing.serviceRadiusMiles ||
                  listing.statesServed ||
                  listing.citiesOrMetrosServed ||
                  listing.areaCoveredFrom) && (
                  <div className="mt-6 border-t border-border pt-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                      Service region
                    </h2>
                    <ul className="mt-3 space-y-1.5 text-sm text-secondary">
                      {listing.serviceZipCode && (
                        <li>Service ZIP: {listing.serviceZipCode}</li>
                      )}
                      {listing.serviceRadiusMiles && (
                        <li>Service radius: {listing.serviceRadiusMiles} miles</li>
                      )}
                      {listing.statesServed && <li>States served: {listing.statesServed}</li>}
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
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                    Motor repair shops in nearby areas
                  </h2>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {nearbyLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          prefetch
                          className="font-medium text-primary hover:underline"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        href={sameAreaHref}
                        prefetch
                        className="font-medium text-primary hover:underline"
                      >
                        {sameAreaPage
                          ? sameAreaPage.title
                          : `All motor repair shops in ${sameAreaLabel}`}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/electric-motor-repair-near-me"
                        prefetch
                        className="font-medium text-primary hover:underline"
                      >
                        Find motor repair shops near me →
                      </Link>
                    </li>
                  </ul>
                </div>

                {(logoUrl || gallery.length > 0) && (
                  <div className="mt-8 border-t border-border pt-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-title">
                      Photos
                    </h2>
                    <div className="mt-4 flex flex-col gap-6">
                      {logoUrl && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                            Company logo
                          </h3>
                          <ListingLogoImage
                            src={logoUrl}
                            alt={`${listing.companyName} — electric motor repair logo`}
                          />
                        </div>
                      )}
                      {gallery.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                            Gallery
                          </h3>
                          <p className="mb-3 text-xs text-secondary">
                            Click a photo to view it larger. Use Previous / Next or arrow keys to
                            move between images.
                          </p>
                          <ListingGalleryLightbox
                            urls={gallery}
                            companyName={listing.companyName}
                            city={listing.city}
                            state={listing.state}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <OwnAShopLikeThisModule className="mt-10" />
            <ListingDetailFaqSection items={faqs} shopId={listing.id} />
          </div>
          <div>
            <div className={LISTINGS_FORM_STICKY}>
              <div className="flex flex-col gap-6">
                <ListingDetailCta listing={listingForClient} />
                <ListingReviewsSidebar
                  listingId={listing.id}
                  listingPagePath={`/electric-motor-repair-shops-listings/${canonicalSlug}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
