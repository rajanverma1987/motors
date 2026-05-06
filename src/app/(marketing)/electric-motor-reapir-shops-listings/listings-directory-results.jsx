import Link from "next/link";
import { getPublicListings, getListingsFilteredByLocation } from "@/lib/listings-public";
import { FormContainer } from "@/components/ui/form-layout";
import PublicListingCard from "@/components/listings/public-listing-card";

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

export default async function ListingsDirectoryResults({ searchParams }) {
  const params = typeof searchParams?.then === "function" ? await searchParams : searchParams ?? {};
  const search = (params.search ?? "").trim();
  const city = (params.city ?? "").trim();
  const state = (params.state ?? "").trim();

  const listings = await getPublicListings();
  const byLocation = city || state ? await getListingsFilteredByLocation({ city, state }) : listings;
  const filtered = filterListings(byLocation, search);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
        <form method="GET" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {city && <input type="hidden" name="city" value={city} />}
          {state && <input type="hidden" name="state" value={state} />}
          <input
            type="search"
            name="search"
            placeholder="Search by company, city, state, or zip code…"
            defaultValue={search}
            className="min-w-0 flex-1 max-w-[43.2rem] rounded-md border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-[50.4rem]"
            aria-label="Search listings"
          />
          <p className="text-sm text-secondary">
            {filtered.length} center{filtered.length !== 1 ? "s" : ""} listed
            {(city || state) && (
              <>
                {" "}
                in {[city, state].filter(Boolean).join(", ")}
                <Link href="/electric-motor-reapir-shops-listings" prefetch className="ml-1 text-primary hover:underline">
                  (show all)
                </Link>
              </>
            )}
          </p>
        </form>

        {filtered.length === 0 ? (
          <FormContainer className="py-12 text-center">
            <p className="text-secondary">
              {search
                ? "No centers match your search."
                : city || state
                  ? "No repair centers listed for this area yet."
                  : "No repair centers listed yet."}
            </p>
            {search || city || state ? (
              <Link href="/electric-motor-reapir-shops-listings" prefetch className="mt-3 inline-block text-sm text-primary hover:underline">
                Show all listings
              </Link>
            ) : (
              <Link href="/list-your-electric-motor-services" prefetch className="mt-6 inline-block">
                <span className="text-primary hover:underline">List your center</span>
              </Link>
            )}
          </FormContainer>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing, index) => (
              <PublicListingCard key={listing.id} listing={listing} imagePriority={index < 6} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
