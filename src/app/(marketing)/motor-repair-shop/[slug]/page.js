import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationPageBySlug, getRelatedLocationPages } from "@/lib/location-pages-public";
import { getAllListingsForLocationArea } from "@/lib/listings-public";
import {
  buildLocationListingInsights,
  filterListingsForLocationPage,
  paginateListings,
} from "@/lib/location-page-insights";
import {
  buildLocationAreaLabel,
  buildLocationBuyerChecklist,
  buildLocationFaqItems,
  buildLocationGuideLinks,
  buildLocationHowToSteps,
  buildLocationIntroParagraphs,
} from "@/lib/location-page-content";
import { getListingLocationMatchType } from "@/lib/location-filter";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { usStateToAbbreviation } from "@/lib/us-state-normalize";
import HeroBackground from "@/components/marketing/HeroBackground";
import ListingsWithRepairFormLayout from "@/components/marketing/listings-with-repair-form-layout";
import ListingsRepairFormSidebar from "@/components/marketing/listings-repair-form-sidebar";
import PublicListingCard from "@/components/listings/public-listing-card";
import { LISTINGS_GRID, LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import LocationPageFilters from "@/components/marketing/location-page/location-page-filters";
import LocationPageInsights from "@/components/marketing/location-page/location-page-insights";
import LocationPageBody from "@/components/marketing/location-page/location-page-body";
import LocationPageJsonLd from "@/components/marketing/location-page/location-page-jsonld";

const PAGE_SIZE = 45;

/** Short SERP title with rewinding + state abbr (keeps ~60 chars). */
function buildLocationSeoTitle(page, areaLabel) {
  const city = String(page?.city || "").trim();
  const state = String(page?.state || "").trim();
  const abbr = usStateToAbbreviation(state);
  if (city && abbr) return `Motor Repair & Rewinding in ${city}, ${abbr} | IQMotorBase`;
  if (city && state) return `Motor Repair & Rewinding in ${city}, ${state} | IQMotorBase`;
  if (abbr || state) return `Motor Repair & Rewinding in ${abbr || state} | IQMotorBase`;
  return `Motor Repair & Rewinding in ${areaLabel} | IQMotorBase`;
}

function buildLocationSeoDescription(areaLabel) {
  return (
    `Find certified electric motor repair and rewinding shops in ${areaLabel}. ` +
    `AC motor rewinding, DC armature rewinds, and emergency service. Submit a repair request — ` +
    `matched to shops serving your area.`
  );
}

function buildLocationOgDescription(areaLabel) {
  return (
    `Certified motor repair and rewinding shops in ${areaLabel}. ` +
    `AC, DC, armature, and stator rewinding. Submit a request — shops respond same day.`
  );
}

export async function generateMetadata({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const page = slug ? await getLocationPageBySlug(slug) : null;
  if (!page) return { title: "Motor Repair & Rewinding Shops | IQMotorBase" };
  const baseUrl = getPublicSiteUrl().replace(/\/$/, "");
  const url = `${baseUrl}/motor-repair-shop/${page.slug}`;
  const areaLabel = buildLocationAreaLabel(page);
  const seoTitle = buildLocationSeoTitle(page, areaLabel);
  const description = page.metaDescription?.trim() || buildLocationSeoDescription(areaLabel);
  return {
    title: { absolute: seoTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: seoTitle,
      description: page.metaDescription?.trim() || buildLocationOgDescription(areaLabel),
      url,
      siteName: "IQMotorBase.com",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description:
        page.metaDescription?.trim() ||
        `Find certified motor repair and rewinding shops in ${areaLabel}. Submit a request — matched to shops in your area.`,
    },
    robots: { index: true, follow: true },
  };
}

function buildPageHref(slug, { page, match, capability }) {
  const params = new URLSearchParams();
  if (match) params.set("match", match);
  if (capability) params.set("capability", capability);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/motor-repair-shop/${slug}?${qs}` : `/motor-repair-shop/${slug}`;
}

export default async function MotorRepairShopLocationPage({ params, searchParams }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const resolvedSearchParams = typeof searchParams?.then === "function" ? await searchParams : searchParams ?? {};
  const slug = resolvedParams?.slug?.trim();
  if (!slug) notFound();

  const page = await getLocationPageBySlug(slug);
  if (!page) notFound();

  const area = {
    state: page.state || "",
    city: page.city || "",
    zip: page.zip || "",
  };
  const areaLabel = buildLocationAreaLabel(page);
  const activeMatch = String(resolvedSearchParams?.match || "").trim().toLowerCase();
  const activeCapability = String(resolvedSearchParams?.capability || "").trim().toLowerCase();
  const currentPage = Math.max(1, Number.parseInt(String(resolvedSearchParams?.page || "1"), 10) || 1);

  const [allListings, relatedPages] = await Promise.all([
    getAllListingsForLocationArea(area),
    getRelatedLocationPages(page),
  ]);

  const insights = buildLocationListingInsights(allListings, area);
  const filtered = filterListingsForLocationPage(allListings, {
    match: activeMatch,
    capability: activeCapability,
    area,
  });
  const { listings, total, page: currentPageResolved, totalPages } = paginateListings(filtered, {
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const introParagraphs = buildLocationIntroParagraphs(areaLabel, insights);
  const howToSteps = buildLocationHowToSteps(areaLabel);
  const buyerChecklist = buildLocationBuyerChecklist();
  const faqItems = buildLocationFaqItems(areaLabel);
  const guideLinks = buildLocationGuideLinks();

  const baseUrl = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${baseUrl}/motor-repair-shop/${page.slug}`;

  return (
    <>
      <LocationPageJsonLd
        pageUrl={pageUrl}
        page={page}
        areaLabel={areaLabel}
        faqItems={faqItems}
        listings={filtered}
      />

      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className={`relative z-10 ${LISTINGS_PAGE_CONTAINER}`}>
          <nav className="text-sm text-secondary" aria-label="Breadcrumb">
            <Link href="/electric-motor-repair-shops-listings" prefetch className="text-primary hover:underline">
              All listings
            </Link>
            <span className="mx-2 text-secondary/60">/</span>
            <span className="text-title">By location</span>
          </nav>
          <span className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            By location
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            Electric motor repair and rewinding shops in {areaLabel}
          </h1>
          <p className="mt-4 max-w-[50.4rem] text-lg text-secondary">
            {page.metaDescription ||
              `Browse certified electric motor repair and rewinding centers in ${areaLabel}. Filter by capability — AC motor rewinding, DC armature rewinding, stator rewinds, high-voltage, servo, and emergency service. Open profiles to compare turnaround, testing standards, and certifications, then submit your repair or rewind requirement to be matched directly with shops serving your area.`}
          </p>
          <LocationPageInsights insights={insights} />
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className={LISTINGS_PAGE_CONTAINER}>
          <ListingsWithRepairFormLayout
            sidebar={
              <ListingsRepairFormSidebar
                mode="city"
                city={page.city || ""}
                state={page.state || ""}
                zipCode={page.zip || ""}
              />
            }
          >
          {insights.total > 0 ? (
            <>
              <LocationPageFilters
                slug={page.slug}
                insights={insights}
                activeMatch={activeMatch}
                activeCapability={activeCapability}
              />
              <p className="mb-6 text-sm text-secondary">
                {total} center{total !== 1 ? "s" : ""}
                {activeMatch || activeCapability ? " matching filters" : " in this area"}
              </p>
            </>
          ) : null}

          {insights.total === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-secondary">No repair shops listed for this area yet.</p>
              <Link
                href="/electric-motor-repair-shops-listings"
                prefetch
                className="mt-4 inline-block text-primary hover:underline"
              >
                Browse all listings
              </Link>
            </div>
          ) : total === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-secondary">No centers match these filters.</p>
              <Link href={`/motor-repair-shop/${page.slug}`} className="mt-4 inline-block text-primary hover:underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <div className={LISTINGS_GRID}>
                {listings.map((listing, index) => (
                  <PublicListingCard
                    key={listing.id}
                    listing={listing}
                    imagePriority={index < 6}
                    locationMatchType={getListingLocationMatchType(listing, area)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-secondary">
                    Page {currentPageResolved} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    {currentPageResolved > 1 ? (
                      <Link
                        href={buildPageHref(page.slug, {
                          page: currentPageResolved - 1,
                          match: activeMatch,
                          capability: activeCapability,
                        })}
                        prefetch
                        className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-title hover:bg-muted/40"
                      >
                        ← Previous
                      </Link>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-secondary/60">
                        ← Previous
                      </span>
                    )}
                    {currentPageResolved < totalPages ? (
                      <Link
                        href={buildPageHref(page.slug, {
                          page: currentPageResolved + 1,
                          match: activeMatch,
                          capability: activeCapability,
                        })}
                        prefetch
                        className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-title hover:bg-muted/40"
                      >
                        Next →
                      </Link>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-secondary/60">
                        Next →
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          </ListingsWithRepairFormLayout>

          <LocationPageBody
            areaLabel={areaLabel}
            introParagraphs={introParagraphs}
            howToSteps={howToSteps}
            buyerChecklist={buyerChecklist}
            faqItems={faqItems}
            guideLinks={guideLinks}
            relatedPages={relatedPages}
            insights={insights}
          />
        </div>
      </section>
    </>
  );
}
