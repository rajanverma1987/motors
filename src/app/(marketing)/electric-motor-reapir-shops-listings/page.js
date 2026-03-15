import Link from "next/link";
import { getPublicListings, getListingsFilteredByLocation } from "@/lib/listings-public";
import { getListingSlug } from "@/lib/listing-slug";
import { FormContainer } from "@/components/ui/form-layout";
import ListingsHeroCta from "./listings-hero-cta";
import HeroBackground from "@/components/marketing/HeroBackground";

function ListingCard({ listing }) {
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  const logoUrl = listing.logoUrl?.trim();
  const firstPhoto = Array.isArray(listing.galleryPhotoUrls) && listing.galleryPhotoUrls[0]
    ? listing.galleryPhotoUrls[0]
    : null;
  const imageUrl = logoUrl || (firstPhoto?.startsWith("http") ? firstPhoto : firstPhoto?.startsWith("/") ? firstPhoto : null);
  const slug = getListingSlug(listing.companyName, listing.id);

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

function filterListings(listings, search) {
  const q = (search || "").trim().toLowerCase();
  if (!q) return listings;
  return listings.filter(
    (l) =>
      (l.companyName || "").toLowerCase().includes(q) ||
      (l.city || "").toLowerCase().includes(q) ||
      (l.state || "").toLowerCase().includes(q) ||
      (l.zipCode || "").toLowerCase().includes(q) ||
      (l.serviceZipCode || "").toLowerCase().includes(q)
  );
}

export default async function ListingsPage({ searchParams }) {
  const params = typeof searchParams?.then === "function" ? await searchParams : searchParams ?? {};
  const search = (params.search ?? "").trim();
  const city = (params.city ?? "").trim();
  const state = (params.state ?? "").trim();

  const listings = await getPublicListings();
  const byLocation = city || state ? await getListingsFilteredByLocation({ city, state }) : listings;
  const filtered = filterListings(byLocation, search);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            Directory
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            Find a motor repair center
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-secondary">
            Browse approved repair centers by location. Submit your requirement and we&apos;ll match you with repair centers in your area.
          </p>
          <ListingsHeroCta />
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <form method="GET" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {city && <input type="hidden" name="city" value={city} />}
            {state && <input type="hidden" name="state" value={state} />}
            <input
              type="search"
              name="search"
              placeholder="Search by company, city, state, or zip code…"
              defaultValue={search}
              className="min-w-0 flex-1 max-w-xl rounded-md border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-2xl"
              aria-label="Search listings"
            />
            <p className="text-sm text-secondary">
              {filtered.length} center{filtered.length !== 1 ? "s" : ""} listed
              {(city || state) && (
                <> in {[city, state].filter(Boolean).join(", ")}
                  <Link href="/electric-motor-reapir-shops-listings" className="ml-1 text-primary hover:underline">(show all)</Link>
                </>
              )}
            </p>
          </form>

          {filtered.length === 0 ? (
            <FormContainer className="py-12 text-center">
              <p className="text-secondary">
                {search ? "No centers match your search." : (city || state) ? "No repair centers listed for this area yet." : "No repair centers listed yet."}
              </p>
              {search || city || state ? (
                <Link href="/electric-motor-reapir-shops-listings" className="mt-3 inline-block text-sm text-primary hover:underline">
                  Show all listings
                </Link>
              ) : (
                <Link href="/list-your-electric-motor-services" className="mt-6 inline-block">
                  <span className="text-primary hover:underline">List your center</span>
                </Link>
              )}
            </FormContainer>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
