import Link from "next/link";
import {
  getPublishedMarketplaceItems,
  categoryLabel,
  MARKETPLACE_CATEGORIES,
  absoluteMarketplaceImageUrl,
} from "@/lib/marketplace";
import MarketplaceEmptyWantForm from "@/components/marketing/MarketplaceEmptyWantForm";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const base = getPublicSiteUrl();
  const title = "Motor repair marketplace — parts, motors & equipment";
  const description =
    "Browse listings from motor repair shops and MotorsWinding.com. Search parts, motors, tools, and surplus—request items with no online payment; sellers contact you directly.";
  return {
    title,
    description,
    alternates: { canonical: `${base}/marketplace` },
    openGraph: {
      title,
      description,
      url: `${base}/marketplace`,
      siteName: "MotorsWinding.com",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MarketplaceBrowsePage({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q : "";
  const category = typeof sp?.category === "string" ? sp.category : "all";
  const siteBase = getPublicSiteUrl();
  const items = await getPublishedMarketplaceItems({
    q: q.trim() || undefined,
    category: category === "all" ? undefined : category,
  });
  const categoryDisplayLabel = category !== "all" ? categoryLabel(category) : "";

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-medium text-primary">
            <Link href="/motor-repair-marketplace" className="hover:underline">
              For shops: sell on the marketplace →
            </Link>
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-title sm:text-4xl">Marketplace</h1>
          <p className="mt-3 max-w-2xl text-secondary">
            Parts, motors, tools, and surplus from repair centers and our team. Use search and filters to find what
            you need. When you request an item, the seller contacts you—no checkout or payment on this site.
          </p>

          <form method="get" className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="mp-q" className="mb-1 block text-sm font-medium text-title">
                Search
              </label>
              <input
                id="mp-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Keywords, part #, manufacturer…"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
              />
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="mp-cat" className="mb-1 block text-sm font-medium text-title">
                Category
              </label>
              <select
                id="mp-cat"
                name="category"
                defaultValue={category}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
              >
                <option value="all">All categories</option>
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-8">
            <p className="text-center text-secondary">No listings match your filters. Try different keywords.</p>
            <MarketplaceEmptyWantForm
              variant="empty"
              searchQuery={q.trim()}
              categoryFilter={category === "all" ? "" : category}
              categoryDisplayLabel={categoryDisplayLabel}
            />
          </div>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const raw = Array.isArray(item.images) && item.images[0] ? String(item.images[0]).trim() : "";
                const img = raw ? absoluteMarketplaceImageUrl(raw, siteBase) : null;
                return (
                  <li key={String(item._id)}>
                    <Link
                      href={`/marketplace/${item.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="aspect-[4/3] bg-muted">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-secondary">No image</div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <span className="text-xs font-medium text-primary">{categoryLabel(item.category)}</span>
                        <h2 className="mt-1 font-semibold text-title group-hover:text-primary line-clamp-2">
                          {item.title}
                        </h2>
                        {item.priceDisplay ? (
                          <p className="mt-2 text-sm font-medium text-title">{item.priceDisplay}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-secondary">{item.shopNameSnapshot || "Seller"}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <section className="mt-14 border-t border-border pt-12" aria-labelledby="mp-want-heading">
              <h2 id="mp-want-heading" className="text-center text-xl font-semibold text-title sm:text-2xl">
                Didn&apos;t find what you&apos;re looking for?
              </h2>
              <div className="mt-8 flex justify-center">
                <MarketplaceEmptyWantForm
                  variant="belowListings"
                  searchQuery={q.trim()}
                  categoryFilter={category === "all" ? "" : category}
                  categoryDisplayLabel={categoryDisplayLabel}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
