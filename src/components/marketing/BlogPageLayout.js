import Image from "next/image";
import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand-logo";
import { MARKETING_CONTENT_DATE } from "@/lib/marketing-content-date";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import { REPAIR_FORM_SIDEBAR_MAX_H } from "@/lib/listings-directory-layout";
import {
  HERO_DASHBOARD_TABLET_HEIGHT,
  HERO_DASHBOARD_TABLET_PATH,
  HERO_DASHBOARD_TABLET_WIDTH,
} from "@/lib/hero-dashboard-seo";

const siteUrl = getPublicSiteUrl();

/**
 * Blog/SEO content page layout: hero + two-column (content + optional sticky sidebar CTA).
 * Use company-listing and customer-facing SEO pages.
 * Pass canonicalPath for JSON-LD Article structured data (e.g. "/why-list-your-motor-repair-shop").
 * Pass heroImage for a full-bleed product visual behind the title (same treatment as home hero).
 */
export default function BlogPageLayout({
  title,
  description,
  breadcrumbLink,
  sidebarTitle,
  sidebarDescription,
  sidebarCta,
  canonicalPath,
  /** Optional full-width block above the main grid (e.g. tools above the sticky quote CTA). */
  topContent,
  /** Rendered below the sidebar CTA (same card on desktop & mobile), e.g. embedded calculator. */
  sidebarBelowCta,
  /** Use a wider right column so sidebar tools (calculator) have more horizontal room. */
  wideSidebar = false,
  /** When false, sidebar scrolls with the page (e.g. tall embedded calculators). */
  stickySidebar = true,
  /** Skip the card wrapper, use for RepairRequestForm and other self-contained sidebar blocks. */
  sidebarUnwrapped = false,
  /**
   * Full-bleed / split hero product visual (e.g. "/images/hero-dashboard-tablet.jpg").
   * When set, uses a split hero: sharp image on one side, readable copy on the other (no heavy wash).
   */
  heroImage = null,
  /** Alt text for heroImage (required for a11y when heroImage is set). */
  heroImageAlt = "",
  /** Optional eyebrow above the H1 in the image hero. */
  heroEyebrow = null,
  /** Optional primary CTA under the hero description (image hero only). */
  heroPrimaryCta = null,
  /** Optional secondary CTA under the hero description (image hero only). */
  heroSecondaryCta = null,
  /** Optional short highlight chips under CTAs (image hero only). */
  heroHighlights = null,
  /** Optional AI quick-answer block rendered before the H1 in the hero. */
  quickAnswer = null,
  children,
}) {
  const sidebarHasLeader = Boolean(sidebarTitle || sidebarDescription || sidebarCta);
  const sidebarHasAny = sidebarHasLeader || Boolean(sidebarBelowCta);
  const sidebarInner = (
    <>
      {sidebarTitle ? <h2 className="text-lg font-semibold text-title">{sidebarTitle}</h2> : null}
      {sidebarDescription ? (
        <p className={`text-sm text-secondary ${sidebarTitle ? "mt-2" : ""}`}>{sidebarDescription}</p>
      ) : null}
      {sidebarCta ? <div className={sidebarTitle || sidebarDescription ? "mt-4 flex flex-col gap-3" : ""}>{sidebarCta}</div> : null}
      {sidebarBelowCta ? (
        <div className={sidebarHasLeader ? "mt-6 border-t border-border pt-6" : "mt-0"}>{sidebarBelowCta}</div>
      ) : null}
    </>
  );

  const origin = siteUrl.replace(/\/$/, "");
  const articleUrl = canonicalPath
    ? `${origin}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`
    : null;
  const heroAbs =
    heroImage != null
      ? `${origin}${String(heroImage).startsWith("/") ? "" : "/"}${heroImage}`
      : null;
  const isTabletHero = heroImage === HERO_DASHBOARD_TABLET_PATH;

  const jsonLd = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: description || undefined,
        url: articleUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
        dateModified: MARKETING_CONTENT_DATE,
        author: { "@type": "Organization", name: "IQMotorBase.com", url: origin },
        publisher: {
          "@type": "Organization",
          name: "IQMotorBase.com",
          url: origin,
          logo: {
            "@type": "ImageObject",
            url: `${origin}${BRAND_LOGO_PUBLIC_PATH}`,
          },
        },
        ...(heroAbs
          ? {
              image: {
                "@type": "ImageObject",
                url: heroAbs,
                contentUrl: heroAbs,
                ...(isTabletHero
                  ? {
                      width: HERO_DASHBOARD_TABLET_WIDTH,
                      height: HERO_DASHBOARD_TABLET_HEIGHT,
                    }
                  : {}),
                caption: heroImageAlt || title,
                description: heroImageAlt || title,
              },
            }
          : {}),
      }
    : null;

  const schemaScriptId = canonicalPath
    ? `schema-article-${canonicalPath.replace(/^\//, "").replace(/\//g, "-") || "page"}`
    : "schema-article";

  const breadcrumbBlock = canonicalPath ? (
    <Breadcrumbs
      items={[
        { name: "Home", url: "/" },
        ...(breadcrumbLink?.href
          ? [{ name: breadcrumbLink.label || "Back", url: breadcrumbLink.href }]
          : []),
        { name: title, url: canonicalPath },
      ]}
    />
  ) : breadcrumbLink?.href ? (
    <Link
      href={breadcrumbLink.href}
      className="inline-flex items-center text-sm text-secondary hover:text-primary"
    >
      ← {breadcrumbLink.label}
    </Link>
  ) : null;

  return (
    <>
      {jsonLd && (
        <script
          id={schemaScriptId}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {heroImage ? (
        <section className="overflow-hidden border-b border-border bg-card">
          <div
            className={`mx-auto grid ${
              wideSidebar ? "max-w-[96rem]" : "max-w-[86.4rem]"
            } lg:grid-cols-2 lg:items-stretch`}
          >
            {/* Copy, solid panel, no blur over the photo */}
            <div className="order-2 flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-14 lg:order-1 lg:px-8 lg:py-16 xl:px-10">
              <div className="mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
                {breadcrumbBlock}
                {quickAnswer ? <div className="mt-4">{quickAnswer}</div> : null}
                {heroEyebrow ? (
                  <span className="mt-4 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary sm:text-sm">
                    {heroEyebrow}
                  </span>
                ) : null}
                <h1
                  className={`text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15] ${
                    heroEyebrow ? "mt-4" : "mt-4"
                  }`}
                >
                  {title}
                </h1>
                {description ? (
                  <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">{description}</p>
                ) : null}
                {(heroPrimaryCta || heroSecondaryCta) && (
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    {heroPrimaryCta}
                    {heroSecondaryCta}
                  </div>
                )}
                {Array.isArray(heroHighlights) && heroHighlights.length > 0 ? (
                  <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary">
                    {heroHighlights.map((label) => (
                      <li key={label} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                        {label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            {/* Product visual, sharp, no frosted overlay */}
            <div className="relative order-1 min-h-[16rem] w-full bg-bg sm:min-h-[20rem] lg:order-2 lg:min-h-[min(68vh,34rem)]">
              <Image
                src={heroImage}
                alt={heroImageAlt || title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              {/* Soft seam only, keeps left edge from looking cut-off without washing the UI */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-card/40 to-transparent lg:block"
                aria-hidden
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
          <HeroBackground />
          <div className="relative z-10 mx-auto max-w-[67.2rem] px-4 sm:px-6">
            {breadcrumbBlock}
            {quickAnswer ? <div className="mt-4">{quickAnswer}</div> : null}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description ? <p className="mt-4 text-lg text-secondary">{description}</p> : null}
          </div>
        </section>
      )}

      <div className={`mx-auto px-4 sm:px-6 ${wideSidebar ? "max-w-[96rem]" : "max-w-[86.4rem]"}`}>
        {topContent ? <div className="pt-10 sm:pt-12 md:pt-14">{topContent}</div> : null}
        {/* Default ~65/35; sidebarUnwrapped (inline form) ~62/38 (~10% wider form); wideSidebar ~48/52 */}
        <div
          className={`grid grid-cols-1 gap-8 py-12 sm:py-16 ${
            wideSidebar
              ? "md:grid-cols-[minmax(0,11fr)_minmax(0,13fr)]"
              : sidebarUnwrapped
                ? "md:grid-cols-[minmax(0,12fr)_minmax(0,8fr)]"
                : "md:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]"
          }`}
        >
          {/* Mobile CTA / tools, above content, only on small screens */}
          {sidebarHasAny ? (
            sidebarUnwrapped ? (
              <div className="md:hidden">{sidebarInner}</div>
            ) : sidebarHasLeader ? (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:hidden">{sidebarInner}</div>
            ) : (
              <div className="md:hidden">{sidebarBelowCta}</div>
            )
          ) : null}
          {/* Main content - left column */}
          <div className="min-w-0 md:col-start-1 md:row-start-1">
            {children}
          </div>

          {/* Sidebar, optionally sticky on md+ so short CTAs stay in view while reading */}
          <aside
            className={`hidden min-w-0 md:col-start-2 md:row-start-1 md:block ${
              stickySidebar ? "md:sticky md:top-24 md:self-start" : ""
            } ${sidebarUnwrapped ? REPAIR_FORM_SIDEBAR_MAX_H : ""}`}
          >
            {sidebarUnwrapped ? (
              sidebarInner
            ) : (
              <div className={`rounded-xl border border-border bg-card shadow-sm ${wideSidebar ? "p-5 sm:p-6" : "p-5"}`}>
                {sidebarInner}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
