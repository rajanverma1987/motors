import Link from "next/link";
import Button from "@/components/ui/button";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const PAGE_PATH = "/motor-repair-marketplace";

export async function generateMetadata() {
  const base = getPublicSiteUrl();
  const canonical = `${base}${PAGE_PATH}`;
  const title =
    "Motor Repair Marketplace for Shops — Sell Parts, Surplus Motors & Tools | MotorsWinding.com";
  const description =
    "List electric motor parts, surplus equipment, and shop tools on a B2B-friendly marketplace built for repair and rewinding centers. Publish from your CRM, get buyer requests (no forced checkout), SEO-optimized listing pages, and order tracking—separate from job inventory. For industrial motor shops in the USA.";
  return {
    title,
    description,
    alternates: { canonical: PAGE_PATH },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "MotorsWinding.com",
      type: "website",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const faqItems = [
  {
    q: "What is the MotorsWinding.com motor repair marketplace?",
    a: "It is a public catalog where motor repair and rewinding shops list spare parts, surplus motors, tools, and related equipment. Visitors browse and submit a request with their contact details—you follow up, quote, and invoice the same way you already run your business. It is built into the same CRM you use for work orders and quotes, not a separate storefront product.",
  },
  {
    q: "Is the marketplace the same as my shop inventory for jobs?",
    a: "No. Your on-hand inventory for work orders, receiving, and internal stock lives under Inventory in the dashboard. Marketplace listings are optional public offers you choose to promote. That separation keeps job commitments clear while still letting you monetize surplus or specialty items.",
  },
  {
    q: "Do buyers pay on the website?",
    a: "No. Buyers submit a request (lead-style order) with their information. You close payment and fulfillment on your terms—invoice, card-on-file, net terms, or pickup—without MotorsWinding.com acting as a payment processor for the transaction.",
  },
  {
    q: "Can my listings rank in Google?",
    a: "Each published listing can have its own URL, page title, and description suitable for search and social sharing. That helps individual items and your shop name surface when people search for specific motors, parts, or brands you carry.",
  },
  {
    q: "Who is this marketplace for?",
    a: "Independent motor repair centers, rewind shops, and industrial service shops in the United States that want a professional channel to sell excess stock and specialty items without building a full e-commerce stack.",
  },
  {
    q: "What can we list?",
    a: "Typical categories include electric motor parts, surplus or take-out motors, shop tools, test equipment, and related items—subject to your policies and any platform rules. You control titles, descriptions, images, and when a listing is live.",
  },
  {
    q: "How do we manage requests?",
    a: "Buyer requests are visible in your CRM under Marketplace so your team can respond, convert to a quote or invoice, and track status without losing context in personal inboxes alone.",
  },
  {
    q: "What about platform-managed listings?",
    a: "MotorsWinding.com may also surface select listings with coordinated fulfillment and agreed commercial terms. That path is optional and does not require public checkout on the marketing site.",
  },
];

function JsonLd({ baseUrl }) {
  const url = `${baseUrl}${PAGE_PATH}`;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Motor repair marketplace for shops — MotorsWinding.com",
    description:
      "B2B-friendly marketplace for motor repair and rewinding shops to list parts, surplus motors, and tools from the CRM with SEO-friendly pages and buyer requests.",
    url,
    isPartOf: {
      "@type": "WebSite",
      name: "MotorsWinding.com",
      url: baseUrl,
    },
    about: {
      "@type": "Thing",
      name: "Industrial electric motor repair and rewinding industry",
    },
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Motor repair marketplace", item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

export default function MotorRepairMarketplaceMarketingPage() {
  const baseUrl = getPublicSiteUrl();

  return (
    <div className="min-h-screen bg-bg">
      <JsonLd baseUrl={baseUrl} />

      <div className="border-b border-border bg-gradient-to-b from-primary/[0.08] via-card to-bg">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <nav className="text-sm text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2 text-border" aria-hidden>
              /
            </span>
            <span className="text-title">Motor repair marketplace</span>
          </nav>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
            Motor repair marketplace for electric motor shops — list surplus parts &amp; equipment from your CRM
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-secondary sm:text-xl">
            MotorsWinding.com runs a <strong className="font-semibold text-title">public B2B marketplace</strong>{" "}
            designed for <strong className="font-semibold text-title">motor repair centers, rewind shops</strong>, and
            industrial service teams. Publish listings from the same platform you use for quotes and work—buyers submit a{" "}
            <strong className="font-semibold text-title">request</strong>, not a forced online checkout, so you keep
            control of pricing, credit, and fulfillment while still reaching new demand online.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Get CRM access
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg">
                Browse live listings
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Talk to sales
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-12" aria-labelledby="section-what">
          <h2 id="section-what" className="text-2xl font-bold text-title sm:text-3xl">
            What this marketplace solves for motor repair businesses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            Most independent shops do not need a full shopping cart for every spare part—but they do need a{" "}
            <strong className="text-title">credible, discoverable place</strong> to move surplus motors, take-out
            cores, specialty bearings, and tooling without listing fees eating margin on every SKU. This page describes
            how MotorsWinding.com combines{" "}
            <Link href="/motor-repair-shop-management-software" className="font-medium text-primary hover:underline">
              motor repair shop software
            </Link>{" "}
            workflows with a lightweight public catalog so your team can publish selectively, respond to buyers, and
            keep operational inventory separate from promotional listings.
          </p>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            If you are also building visibility for your shop itself, pair marketplace listings with a{" "}
            <Link href="/list-your-electric-motor-services" className="font-medium text-primary hover:underline">
              directory listing
            </Link>{" "}
            so local and regional searchers find your services—not only individual SKUs.
          </p>
        </section>

        <section className="border-b border-border py-12" aria-labelledby="section-why">
          <h2 id="section-why" className="text-2xl font-bold text-title sm:text-3xl">
            Why shops use the MotorsWinding marketplace
          </h2>
          <ul className="mt-6 space-y-5 text-secondary">
            <li className="leading-relaxed">
              <strong className="text-title">Separate from job-stock inventory</strong> — Your{" "}
              <strong className="text-title">parts catalog</strong> for work orders, receiving, and reservations stays
              under <strong className="text-title">Inventory</strong> in the dashboard. The marketplace is for{" "}
              <strong className="text-title">public listings</strong> you choose to promote—so you never confuse a
              customer&apos;s job with a one-off sale.
            </li>
            <li className="leading-relaxed">
              <strong className="text-title">Publish from the CRM</strong> — Add title, description, category, price
              note, and images. Use drafts until you are ready; then flip to live when pricing and photos are final.
            </li>
            <li className="leading-relaxed">
              <strong className="text-title">SEO-friendly listing pages</strong> — Each item can have its own URL and
              metadata for search and social previews—helpful when buyers search for OEM names, frame sizes, or part
              numbers you stock.
            </li>
            <li className="leading-relaxed">
              <strong className="text-title">No payment friction on the public site</strong> — Buyers send a request
              with contact details. You invoice, collect payment, and ship using the processes you already trust—no
              mandatory cart or processor on the marketing site.
            </li>
            <li className="leading-relaxed">
              <strong className="text-title">Requests in one place</strong> — Buyer inquiries flow into your CRM under
              Marketplace so estimators and counter staff see the same thread without relying on scattered inbox
              screenshots.
            </li>
          </ul>
        </section>

        <section className="border-b border-border py-12" aria-labelledby="section-what-list">
          <h2 id="section-what-list" className="text-2xl font-bold text-title sm:text-3xl">
            What motor repair shops typically list
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            Exact categories evolve with your shop, but teams often use the marketplace for items that are easy to
            describe with photos and a clear condition story—without needing full e-commerce tax and freight automation
            on day one.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-title">Parts &amp; consumables</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Bearings, seals, insulation, brushes, fans, and other SKUs that are surplus to your current pipeline or
                bought in bulk.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-title">Surplus &amp; take-out motors</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Units removed from service, shop rebuilds, or customer trade-ins—documented with nameplate data and
                testing notes when available.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-title">Tools &amp; test gear</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Meggers, winding testers, balances, and shop equipment you are upgrading or consolidating.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-title">Specialty or hard-to-find items</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Odd lots that search traffic can find—ideal when buyers search for a manufacturer or frame size you
                happen to have on the shelf.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-12" aria-labelledby="section-how">
          <h2 id="section-how" className="text-2xl font-bold text-title sm:text-3xl">
            How it works (end-to-end)
          </h2>
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-secondary marker:font-semibold marker:text-primary">
            <li className="leading-relaxed pl-1">
              <strong className="text-title">Activate your CRM</strong> — Register for MotorsWinding.com and open the
              dashboard. Your team uses the same workspace for quotes, jobs, and marketplace listings.
            </li>
            <li className="leading-relaxed pl-1">
              <strong className="text-title">Create a listing</strong> — Add product copy, category, condition, and
              images. Keep it in draft until pricing and compliance checks are done.
            </li>
            <li className="leading-relaxed pl-1">
              <strong className="text-title">Publish</strong> — Go live when ready. The public{" "}
              <Link href="/marketplace" className="font-medium text-primary hover:underline">
                marketplace
              </Link>{" "}
              lets visitors filter and open individual listing pages.
            </li>
            <li className="leading-relaxed pl-1">
              <strong className="text-title">Respond to requests</strong> — Buyers submit contact details and a short
              message. Your team replies, converts to a quote or invoice, and coordinates pickup or shipping.
            </li>
            <li className="leading-relaxed pl-1">
              <strong className="text-title">Measure and refine</strong> — Double down on titles and photos that
              generate qualified requests; retire listings that no longer match your inventory strategy.
            </li>
          </ol>
        </section>

        <section className="border-b border-border py-12" aria-labelledby="section-compare">
          <h2 id="section-compare" className="text-2xl font-bold text-title sm:text-3xl">
            Marketplace vs. generic classifieds or consumer marketplaces
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            General-purpose listing sites can work for one-off sales, but they often bury{" "}
            <strong className="text-title">B2B motor trade</strong> in unrelated categories and offer weak signals for
            industrial buyers. When listings live next to your{" "}
            <Link href="/features" className="font-medium text-primary hover:underline">
              shop operations
            </Link>{" "}
            and brand context, you reduce back-and-forth on credibility and make it easier for maintenance teams to
            trust the source.
          </p>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            You still control pricing and payment—this is not a race-to-the-bottom auction. It is a{" "}
            <strong className="text-title">lead-generation channel</strong> aligned with how motor repair shops
            actually close work in the United States.
          </p>
        </section>

        <section className="border-b border-border py-12" aria-labelledby="section-platform">
          <h2 id="section-platform" className="text-2xl font-bold text-title sm:text-3xl">
            Platform listings &amp; commission paths
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            MotorsWinding.com may also list or promote select items on your behalf. Those orders are coordinated through
            admin workflows so we can align fulfillment with any commission structure you agree to—still without
            forcing a public checkout experience on the marketing site. Ask about availability when you{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
        </section>

        <section className="border-b border-border py-12" aria-labelledby="section-faq">
          <h2 id="section-faq" className="text-2xl font-bold text-title sm:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-8 space-y-8">
            {faqItems.map((item) => (
              <div key={item.q} className="border-b border-border/80 pb-8 last:border-0 last:pb-0">
                <dt className="text-lg font-semibold text-title">{item.q}</dt>
                <dd className="mt-3 text-base leading-relaxed text-secondary">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="rounded-2xl border border-border bg-gradient-to-br from-card to-bg p-8 sm:p-10"
          aria-labelledby="section-cta"
        >
          <h2 id="section-cta" className="text-xl font-bold text-title sm:text-2xl">
            Ready to list from your motor repair CRM?
          </h2>
          <p className="mt-3 max-w-2xl text-secondary">
            Open <strong className="text-title">Marketplace</strong> in your dashboard sidebar after you sign in. New
            to the platform? Start with a plan that fits your shop, or talk to us about{" "}
            <Link href="/pricing" className="font-medium text-primary hover:underline">
              pricing
            </Link>{" "}
            and onboarding.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register">
              <Button variant="primary" size="sm">
                Create account
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="sm">
                Talk to us
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="sm">
                Browse listings
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-bg py-10 text-center sm:text-left">
          <p className="text-sm text-secondary">
            Related:{" "}
            <Link href="/careers" className="font-medium text-primary hover:underline">
              Careers
            </Link>{" "}
            ·{" "}
            <Link href="/job-board" className="font-medium text-primary hover:underline">
              Job board
            </Link>{" "}
            ·{" "}
            <Link href="/developers/api" className="font-medium text-primary hover:underline">
              API for developers
            </Link>
          </p>
        </section>
      </article>
    </div>
  );
}
