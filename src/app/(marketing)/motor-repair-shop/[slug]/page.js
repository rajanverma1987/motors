import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationPageBySlug } from "@/lib/location-pages-public";
import { getListingsFilteredByLocationPaginated } from "@/lib/listings-public";
import HeroBackground from "@/components/marketing/HeroBackground";
import ListingsHeroCta from "@/app/(marketing)/electric-motor-reapir-shops-listings/listings-hero-cta";
import PublicListingCard from "@/components/listings/public-listing-card";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motors.example.com";
const PAGE_SIZE = 45;

export async function generateMetadata({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug;
  const page = slug ? await getLocationPageBySlug(slug) : null;
  if (!page) return { title: "Motor repair shops" };
  const url = `${baseUrl}/motor-repair-shop/${page.slug}`;
  return {
    title: page.title,
    description: page.metaDescription || `Find motor repair shops in ${[page.city, page.state].filter(Boolean).join(", ") || page.title}.`,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.metaDescription || undefined,
      url,
    },
  };
}

export default async function MotorRepairShopLocationPage({ params, searchParams }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const resolvedSearchParams = typeof searchParams?.then === "function" ? await searchParams : searchParams ?? {};
  const slug = resolvedParams?.slug?.trim();
  if (!slug) notFound();

  const page = await getLocationPageBySlug(slug);
  if (!page) notFound();

  const currentPage = Math.max(1, Number.parseInt(String(resolvedSearchParams?.page || "1"), 10) || 1);
  const { listings, total, page: currentPageResolved, totalPages } = await getListingsFilteredByLocationPaginated({
    state: page.state || "",
    city: page.city || "",
    zip: page.zip || "",
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const areaLabel = [page.city, page.state].filter(Boolean).join(", ") || page.title;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <Link
            href="/electric-motor-reapir-shops-listings"
            prefetch
            className="inline-flex items-center text-sm text-secondary hover:text-primary"
          >
            ← All listings
          </Link>
          <span className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            By location
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-[50.4rem] text-lg text-secondary">
            {page.metaDescription || `Browse approved motor repair and rewinding centers in ${areaLabel}. Contact shops directly or submit your requirement.`}
          </p>
          <ListingsHeroCta />
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <p className="mb-6 text-sm text-secondary">
            {total} center{total !== 1 ? "s" : ""} in this area
          </p>
          {total === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-secondary">No repair centers listed for this area yet.</p>
              <Link href="/electric-motor-reapir-shops-listings" prefetch className="mt-4 inline-block text-primary hover:underline">
                Browse all listings
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing, index) => (
                  <PublicListingCard key={listing.id} listing={listing} imagePriority={index < 6} />
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
                        href={`/motor-repair-shop/${page.slug}?page=${currentPageResolved - 1}`}
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
                        href={`/motor-repair-shop/${page.slug}?page=${currentPageResolved + 1}`}
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
        </div>
      </section>
    </>
  );
}
