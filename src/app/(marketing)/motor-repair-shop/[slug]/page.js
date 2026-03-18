import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationPageBySlug } from "@/lib/location-pages-public";
import { getListingsFilteredByLocation } from "@/lib/listings-public";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import HeroBackground from "@/components/marketing/HeroBackground";
import ListingsHeroCta from "@/app/(marketing)/electric-motor-reapir-shops-listings/listings-hero-cta";

function ListingCard({ listing }) {
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  const logoUrl = listing.logoUrl?.trim();
  const firstPhoto = Array.isArray(listing.galleryPhotoUrls) && listing.galleryPhotoUrls[0]
    ? listing.galleryPhotoUrls[0]
    : null;
  const imageUrl = logoUrl || (firstPhoto?.startsWith("http") ? firstPhoto : firstPhoto?.startsWith("/") ? firstPhoto : null);
  const slug = getListingPublicPathSegment(listing);

  return (
    <Link
      href={`/electric-motor-reapir-shops-listings/${slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg hover:border-primary/30"
    >
      {imageUrl && (
        <div className="aspect-video w-full bg-bg">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold text-title">{listing.companyName}</h2>
        {location && (
          <p className="mt-1 text-sm text-secondary">{location}</p>
        )}
        {listing.shortDescription && (
          <p className="mt-2 line-clamp-3 text-sm text-secondary">
            {listing.shortDescription}
          </p>
        )}
        <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
          View details →
        </span>
      </div>
    </Link>
  );
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motors.example.com";

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

export default async function MotorRepairShopLocationPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolvedParams?.slug?.trim();
  if (!slug) notFound();

  const page = await getLocationPageBySlug(slug);
  if (!page) notFound();

  const listings = await getListingsFilteredByLocation({
    state: page.state || "",
    city: page.city || "",
    zip: page.zip || "",
  });

  const areaLabel = [page.city, page.state].filter(Boolean).join(", ") || page.title;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <Link
            href="/electric-motor-reapir-shops-listings"
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
          <p className="mt-4 max-w-2xl text-lg text-secondary">
            {page.metaDescription || `Browse approved motor repair and rewinding centers in ${areaLabel}. Contact shops directly or submit your requirement.`}
          </p>
          <ListingsHeroCta />
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-6 text-sm text-secondary">
            {listings.length} center{listings.length !== 1 ? "s" : ""} in this area
          </p>
          {listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-secondary">No repair centers listed for this area yet.</p>
              <Link href="/electric-motor-reapir-shops-listings" className="mt-4 inline-block text-primary hover:underline">
                Browse all listings
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
