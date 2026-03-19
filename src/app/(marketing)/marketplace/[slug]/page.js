import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedItemBySlug, getAllPublishedSlugs, categoryLabel } from "@/lib/marketplace";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import MarketplaceOrderForm from "../marketplace-order-form";

export async function generateStaticParams() {
  try {
    const slugs = await getAllPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolved?.slug;
  const item = slug ? await getPublishedItemBySlug(String(slug)) : null;
  const base = getPublicSiteUrl();
  if (!item) {
    return { title: "Listing not found | Marketplace" };
  }
  const title = `${item.title} | Marketplace`;
  const desc = (item.description || `${item.title} — ${categoryLabel(item.category)}. Request from seller on MotorsWinding.com.`).slice(
    0,
    160
  );
  const url = `${base}/marketplace/${item.slug}`;
  const ogImage = Array.isArray(item.images) && item.images[0] ? item.images[0] : null;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: item.title,
      description: desc,
      url,
      siteName: "MotorsWinding.com",
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: item.title }] : [],
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: item.title,
      description: desc,
      images: ogImage ? [ogImage] : [],
    },
    robots: { index: true, follow: true },
  };
}

function productJsonLd(item, canonicalUrl) {
  const images = Array.isArray(item.images) ? item.images.filter(Boolean).slice(0, 10) : [];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: (item.description || "").slice(0, 5000),
    image: images.length ? images : undefined,
    category: categoryLabel(item.category),
    brand: item.shopNameSnapshot
      ? { "@type": "Brand", name: item.shopNameSnapshot }
      : undefined,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      url: canonicalUrl,
      description: item.priceDisplay || "Contact seller for pricing",
    },
  };
}

export default async function MarketplaceItemPage({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolved?.slug;
  if (!slug) notFound();
  const item = await getPublishedItemBySlug(String(slug));
  if (!item) notFound();

  const base = getPublicSiteUrl();
  const canonicalUrl = `${base}/marketplace/${item.slug}`;
  const jsonLd = productJsonLd(item, canonicalUrl);
  const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-bg">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            <Link href="/marketplace" className="text-sm text-primary hover:underline">
              ← Back to marketplace
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-title sm:text-4xl">{item.title}</h1>
            <p className="mt-2 text-sm text-secondary">
              {categoryLabel(item.category)}
              {item.condition ? ` · ${item.condition}` : ""}
              {item.shopNameSnapshot ? ` · ${item.shopNameSnapshot}` : ""}
            </p>
            {item.priceDisplay ? (
              <p className="mt-3 text-lg font-semibold text-title">{item.priceDisplay}</p>
            ) : null}
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {images.length > 0 ? (
                <div className="space-y-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[0]}
                    alt=""
                    className="w-full max-h-[480px] rounded-xl border border-border object-contain bg-muted"
                  />
                  {images.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {images.slice(1).map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-20 w-20 rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-secondary">
                  No images
                </div>
              )}
              <div className="prose prose-sm mt-8 max-w-none text-title dark:prose-invert">
                <h2 className="text-lg font-semibold">Description</h2>
                <p className="whitespace-pre-wrap text-secondary">{item.description || "No description provided."}</p>
              </div>
            </div>
            <div className="lg:col-span-2">
              <MarketplaceOrderForm itemSlug={item.slug} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
