import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const PAGE_PATH = "/benefits-of-motor-repair-directory";

export async function generateMetadata() {
  const base = getPublicSiteUrl();
  const canonical = `${base}${PAGE_PATH}`;
  const title =
    "Benefits of a Motor Repair Directory — Leads, Trust & Visibility for Electric Motor Shops | MotorsWinding.com";
  const description =
    "Why electric motor repair and rewinding shops list in a dedicated directory: qualified buyer intent, niche SEO visibility, credibility, lower cost than broad ads, and reach beyond word-of-mouth. USA-focused guide for industrial motor service businesses.";
  return {
    title,
    description,
    keywords: [
      "motor repair directory benefits",
      "electric motor repair directory",
      "motor rewinding directory listing",
      "qualified motor repair leads",
      "motor repair shop visibility",
      "industrial motor repair directory",
      "motor repair marketing",
      "electric motor shop leads",
    ],
    authors: [{ name: "MotorsWinding.com" }],
    alternates: { canonical: PAGE_PATH },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: "MotorsWinding.com",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const faqItems = [
  {
    q: "What is the main benefit of a motor repair directory vs. a general business directory?",
    a: "Buyers filter by industry and service type. A motor-specific directory surfaces repair, rewinding, balancing, and related capabilities—so you compete with peer shops, not restaurants or retail stores. That usually means higher intent and fewer wasted calls.",
  },
  {
    q: "How do directory listings help with leads?",
    a: "People searching for motor repair or rewinding often start with category and location keywords. A listing gives you a second indexed presence with structured business data and a clear contact path—so inquiries arrive while the need is active.",
  },
  {
    q: "Is a directory listing cheaper than paid search?",
    a: "Typically yes for ongoing visibility. Paid search charges per click and stops when budget stops. A directory listing is a persistent asset that can keep working as the directory grows authority for industry terms.",
  },
  {
    q: "Does a listing help SEO for my own website?",
    a: "A reputable directory can provide consistent citations (name, address, phone) and a relevant backlink. Together with your own content and Google Business Profile, that supports local and industry search signals.",
  },
  {
    q: "What credibility benefits do shops get?",
    a: "Complete profiles with services, certifications, hours, and photos help buyers verify you are a real operation with the right equipment. That reduces friction before the first phone call.",
  },
  {
    q: "Can I reach buyers outside my current customer list?",
    a: "Yes. New facilities, maintenance contractors, and procurement teams search for vendors by region and capability. A directory helps you appear in those discovery moments—not only when someone already knows your name.",
  },
  {
    q: "How does this relate to selling parts on a marketplace?",
    a: "Directories promote your shop as a service provider. Marketplaces help buyers find parts and equipment. Many shops use both: directory for repair authority, marketplace for surplus inventory. See our marketplace overview for details.",
  },
  {
    q: "How do I list my motor repair shop?",
    a: "Submit your business through our listing flow, verify contact details, and complete your profile. You can register for an account to manage updates and respond to inquiries centrally.",
  },
];

function ExtraJsonLd({ baseUrl }) {
  const url = `${baseUrl}${PAGE_PATH}`;
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Benefits of a motor repair directory", item: url },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

export default function BenefitsOfMotorRepairDirectoryPage() {
  const baseUrl = getPublicSiteUrl();

  return (
    <>
      <ExtraJsonLd baseUrl={baseUrl} />
      <BlogPageLayout
        title="Benefits of listing in a motor repair directory"
        description="A dedicated electric motor repair and rewinding directory connects your shop with buyers who are actively looking for repair, rewinding, and related services—so you spend less time chasing cold leads and more time winning jobs. Below are the practical benefits shops see when they invest in a niche directory alongside their website and local presence."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={PAGE_PATH}
        sidebarTitle="List your center"
        sidebarDescription="Join repair shops that receive qualified leads from our directory. Free to register and easy to manage."
        sidebarCta={<ListYourShopCta />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="not-prose rounded-xl border border-border bg-card/50 p-5 sm:p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Directory benefits · B2B motor repair</p>
            <p className="mt-3 text-base leading-relaxed text-secondary">
              If you run an independent rewind shop or multi-service motor center, you compete on{" "}
              <strong className="text-title">speed, capability, and trust</strong>. A qualified directory amplifies those
              strengths by putting your shop in front of facility managers and maintenance teams who already know they
              need motor work—not generic web traffic. For a deeper strategic angle, read{" "}
              <Link href="/why-list-your-motor-repair-shop" className="font-medium text-primary hover:underline">
                why list your motor repair shop
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Qualified leads, not random traffic
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Buyers who use a motor repair directory already know they need repair or rewinding. They&apos;re comparing
              shops, checking capabilities, and often requesting quotes. That means the leads you get are pre-qualified
              by intent—unlike generic ads or broad directories where most visitors aren&apos;t looking for motor work.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That intent difference matters for{" "}
              <strong className="text-title">estimators and counter staff</strong>: fewer calls from people who actually
              needed a different trade, and more conversations that match your shop floor and test equipment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Visibility where it matters
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Directories built for motor repair rank for terms like &quot;motor repair shops,&quot; &quot;electric motor
              rewinding,&quot; and &quot;industrial motor repair.&quot; When your shop is listed, you share in that
              visibility. As the directory grows and gains authority, your listing continues to surface to new buyers
              without extra ad spend.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For regional coverage, explore{" "}
              <Link href="/usa/motor-repair-business-listing" className="font-medium text-primary hover:underline">
                USA motor repair business listings
              </Link>{" "}
              and state or city pages—many buyers search with geography plus service keywords.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Credibility and trust
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              A complete, accurate profile—services, certifications, service area, contact info—helps buyers verify that
              you&apos;re a real shop with the right capabilities. Many use the directory as a first check before
              calling. Consistent information across the directory and your own site reinforces trust and supports your
              reputation.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Align your directory listing with your{" "}
              <strong className="text-title">website and Google Business Profile</strong> so name, address, and phone
              match across the web—reducing doubt and confusion on the first contact.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Low cost, ongoing results
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Listing in a focused directory is usually a fraction of the cost of paid search or large-scale SEO. You
              get a persistent listing that works for you over time. There&apos;s no per-click fee—you pay to be present,
              and you receive leads as they come in. For many shops, that&apos;s a better return than one-off campaigns.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That does not replace paid search when you need to dominate a narrow campaign—but it adds a{" "}
              <strong className="text-title">baseline discovery channel</strong> that does not turn off when the ad
              budget runs out.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Reach beyond your immediate network
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              New plants, new maintenance staff, and new projects don&apos;t always know your shop. A directory
              introduces you to buyers outside your current customer base. When they search by location, service type, or
              industry, your listing can appear—so you&apos;re considered even when you&apos;re not the incumbent vendor.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Pair visibility with strong follow-up:{" "}
              <Link href="/how-motor-repair-shops-get-more-customers" className="font-medium text-primary hover:underline">
                how motor repair shops get more customers
              </Link>{" "}
              is as much about process as it is about traffic.
            </p>
          </section>

          <section className="not-prose mt-12 rounded-xl border border-border bg-gradient-to-br from-card to-bg p-6 sm:p-8">
            <h2 className="text-xl font-bold text-title sm:text-2xl">
              Directory vs. marketplace—what you get from each
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border border-border bg-bg/80 p-4">
                <h3 className="font-semibold text-title">Directory (your shop)</h3>
                <p className="mt-2 text-secondary leading-relaxed">
                  Promotes <strong className="text-title">repair and rewinding services</strong>, service area, and
                  credibility. Best for “who should fix this motor?” searches.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg/80 p-4">
                <h3 className="font-semibold text-title">Marketplace (parts &amp; equipment)</h3>
                <p className="mt-2 text-secondary leading-relaxed">
                  Promotes <strong className="text-title">listings and surplus inventory</strong>. Best for “do you have
                  this part or motor?” See{" "}
                  <Link href="/motor-repair-marketplace" className="font-medium text-primary hover:underline">
                    motor repair marketplace
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-12">
              Turn visibility into jobs with your CRM
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The benefit of a lead is only realized when your team converts it. MotorsWinding.com offers{" "}
              <Link href="/features" className="font-medium text-primary hover:underline">
                quotes, work orders, and customer records
              </Link>{" "}
              so directory inquiries don&apos;t stall in personal inboxes. For a full operational view, see{" "}
              <Link href="/motor-repair-shop-management-software" className="font-medium text-primary hover:underline">
                motor repair shop management software
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-8 not-prose">
              {faqItems.map((item) => (
                <div key={item.q} className="border-b border-border pb-8 last:border-0 last:pb-0">
                  <dt className="text-lg font-semibold text-title">{item.q}</dt>
                  <dd className="mt-3 text-base leading-relaxed text-secondary">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t border-border pt-10 mt-12 not-prose">
            <h2 className="text-xl font-bold text-title sm:text-2xl">Get listed and start receiving leads</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
                List your electric motor repair center
              </Link>{" "}
              in our directory.{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Create a free account
              </Link>{" "}
              to manage your profile and respond to quote requests in one place. Questions?{" "}
              <Link href="/contact" className="text-primary font-medium hover:underline">
                Contact us
              </Link>{" "}
              or review{" "}
              <Link href="/pricing" className="text-primary font-medium hover:underline">
                pricing
              </Link>
              .
            </p>
            <p className="mt-4 text-sm text-secondary">
              Related:{" "}
              <Link href="/why-list-your-motor-repair-shop" className="font-medium text-primary hover:underline">
                Why list your motor repair shop
              </Link>{" "}
              ·{" "}
              <Link href="/careers" className="font-medium text-primary hover:underline">
                Careers
              </Link>
            </p>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
