import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com";

/**
 * Blog/SEO content page layout: hero + two-column (content + sticky sidebar CTA).
 * Use company-listing and customer-facing SEO pages.
 * Pass canonicalPath for JSON-LD Article structured data (e.g. "/why-list-your-motor-repair-shop").
 */
export default function BlogPageLayout({
  title,
  description,
  breadcrumbLink,
  sidebarTitle,
  sidebarDescription,
  sidebarCta,
  canonicalPath,
  children,
}) {
  const articleUrl = canonicalPath ? `${siteUrl.replace(/\/$/, "")}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}` : null;
  const jsonLd = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: description || undefined,
        url: articleUrl,
        publisher: { "@type": "Organization", name: "MotorsWinding.com" },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          {breadcrumbLink?.href && (
            <Link
              href={breadcrumbLink.href}
              className="inline-flex items-center text-sm text-secondary hover:text-primary"
            >
              ← {breadcrumbLink.label}
            </Link>
          )}
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-lg text-secondary">{description}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ~65% content | ~35% CTA on md+ */}
        <div className="grid grid-cols-1 gap-8 py-12 sm:py-16 md:grid-cols-[13fr_7fr]">
          {/* Mobile CTA - above content, only on small screens */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:hidden">
            <h2 className="text-lg font-semibold text-title">{sidebarTitle}</h2>
            {sidebarDescription && (
              <p className="mt-2 text-sm text-secondary">{sidebarDescription}</p>
            )}
            <div className="mt-4 flex flex-col gap-3">{sidebarCta}</div>
          </div>
          {/* Main content - left column, 80% width on md+ */}
          <div className="min-w-0 md:col-start-1 md:row-start-1">
            {children}
          </div>

          {/* Sidebar CTA - right column 20% on md+, sticky */}
          <aside className="hidden min-w-0 md:block md:col-start-2 md:row-start-1 md:sticky md:top-24 md:self-start">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-title">{sidebarTitle}</h2>
              {sidebarDescription && (
                <p className="mt-2 text-sm text-secondary">{sidebarDescription}</p>
              )}
              <div className="mt-4 flex flex-col gap-3">
                {sidebarCta}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
