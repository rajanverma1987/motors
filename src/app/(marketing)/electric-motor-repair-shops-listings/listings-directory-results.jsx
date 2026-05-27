import Link from "next/link";
import { getPublicListingsPaginated } from "@/lib/listings-public";
import { FormContainer } from "@/components/ui/form-layout";
import PublicListingCard from "@/components/listings/public-listing-card";

const PAGE_SIZE = 40;

export default async function ListingsDirectoryResults({ searchParams }) {
  const params = typeof searchParams?.then === "function" ? await searchParams : searchParams ?? {};
  const search = (params.search ?? "").trim();
  const city = (params.city ?? "").trim();
  const state = (params.state ?? "").trim();
  const page = Math.max(1, Number.parseInt(String(params.page || "1"), 10) || 1);

  const { listings, total, page: currentPage, totalPages } = await getPublicListingsPaginated({
    search,
    city,
    state,
    page,
    pageSize: PAGE_SIZE,
  });

  const withParams = (nextPage) => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (city) next.set("city", city);
    if (state) next.set("state", state);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/electric-motor-repair-shops-listings?${qs}` : "/electric-motor-repair-shops-listings";
  };

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
            {total} center{total !== 1 ? "s" : ""} listed
            {(city || state) && (
              <>
                {" "}
                in {[city, state].filter(Boolean).join(", ")}
                <Link href="/electric-motor-repair-shops-listings" prefetch className="ml-1 text-primary hover:underline">
                  (show all)
                </Link>
              </>
            )}
          </p>
        </form>

        {total === 0 ? (
          <FormContainer className="py-12 text-center">
            <p className="text-secondary">
              {search
                ? "No centers match your search."
                : city || state
                  ? "No repair centers listed for this area yet."
                  : "No repair centers listed yet."}
            </p>
            {search || city || state ? (
              <Link href="/electric-motor-repair-shops-listings" prefetch className="mt-3 inline-block text-sm text-primary hover:underline">
                Show all listings
              </Link>
            ) : (
              <Link href="/list-your-electric-motor-services" prefetch className="mt-6 inline-block">
                <span className="text-primary hover:underline">List your center</span>
              </Link>
            )}
          </FormContainer>
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
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={withParams(currentPage - 1)}
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
                  {currentPage < totalPages ? (
                    <Link
                      href={withParams(currentPage + 1)}
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
  );
}
