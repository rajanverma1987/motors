import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const PAGE_PATH = "/why-list-your-motor-repair-shop";

export async function generateMetadata() {
  const base = getPublicSiteUrl();
  const canonical = `${base}${PAGE_PATH}`;
  const title =
    "Why List Your Motor Repair Shop in a Directory? Leads, Trust & Local SEO | MotorsWinding.com";
  const description =
    "Qualified electric motor repair and rewinding directories put your shop in front of facility managers and maintenance buyers searching for repair near them. Learn benefits vs generic listings, what to put on your profile, and how to capture leads—USA-focused motor repair marketing.";
  return {
    title,
    description,
    keywords: [
      "list motor repair shop",
      "motor repair directory",
      "electric motor repair listing",
      "motor rewinding shop directory",
      "get more motor repair customers",
      "industrial motor repair leads",
      "motor repair near me SEO",
      "electric motor shop marketing",
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
    q: "Why should I list my motor repair shop in a directory instead of only using my website?",
    a: "Your website is essential, but many buyers discover shops through category searches and comparison browsing. A motor-specific directory captures search intent for “electric motor repair,” “rewinding,” and location-based queries—and gives you a second indexed presence with structured business information that reinforces trust.",
  },
  {
    q: "How is a motor repair directory different from Google Business Profile?",
    a: "Google Business Profile is critical for local maps and reviews. A qualified industry directory adds another trusted citation, niche keywords, and often richer service fields (e.g., AC/DC, VFD, pump motors) so you match buyers who search by capability—not only by city name.",
  },
  {
    q: "Will I get low-quality leads?",
    a: "No channel guarantees perfect leads, but a focused directory reduces noise versus generic classifieds. Buyers who search for industrial motor repair or rewinding are usually closer to a real need. Clear service areas, capabilities, and response expectations on your profile improve qualification.",
  },
  {
    q: "What should I include on my listing for best results?",
    a: "Use accurate business name and address, service radius or states served, core services (repair, rewind, balancing, machining), industries (HVAC, wastewater, OEM), certifications, hours, and a direct phone or quote path. Photos of your shop floor and test equipment increase confidence.",
  },
  {
    q: "Is directory listing free?",
    a: "Yes. Listing your motor repair shop with us is always free. You still get long-term visibility while avoiding the per-click cost of always-on paid search. As the directory earns authority for industry terms, your listing benefits from that growth with no listing fee.",
  },
  {
    q: "Does a listing help SEO for my own domain?",
    a: "Consistent name-address-phone (NAP) and reputable backlinks support local SEO. A legitimate directory listing can reinforce signals that your shop is a real, established operation—especially when paired with reviews and your own content.",
  },
  {
    q: "Can I manage leads in one place?",
    a: "On MotorsWinding.com you can pair a directory presence with CRM tools—quotes, work orders, and customer records—so inquiries do not die in a single inbox. See our features and registration paths for details.",
  },
  {
    q: "How do I get started?",
    a: "Submit your shop through the list-your-business flow, verify contact details, and complete your profile. You can also create an account to manage updates and respond to inquiries centrally.",
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
      { "@type": "ListItem", position: 2, name: "Why list your motor repair shop", item: url },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

export default function WhyListYourMotorRepairShopPage() {
  const baseUrl = getPublicSiteUrl();

  return (
    <>
      <ExtraJsonLd baseUrl={baseUrl} />
      <BlogPageLayout
        title="Why list your motor repair shop in a qualified directory?"
        description="Getting listed in a dedicated electric motor repair and rewinding directory puts your shop in front of facility managers, maintenance teams, and procurement specialists who are actively searching for repair services—not random browsers. Combined with accurate local signals and a complete profile, it supports trust, SEO, and a steady pipeline of qualified inquiries."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={PAGE_PATH}
        sidebarTitle="Get your shop in front of buyers"
        sidebarDescription="List your center in our directory and start receiving qualified leads from companies searching for motor repair and rewinding services."
        sidebarCta={<ListYourShopCta />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="not-prose rounded-xl border border-border bg-card/50 p-5 sm:p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Motor repair marketing · USA</p>
            <p className="mt-3 text-base leading-relaxed text-secondary">
              Independent shops compete with national service brands, OEM affiliates, and word-of-mouth. A{" "}
              <strong className="text-title">niche directory</strong> helps you show up when buyers compare options and
              validates that you repair and rewind the equipment they run—whether that is AC induction, DC, pump sets, or
              critical spares in{" "}
              <Link href="/usa/motor-repair-business-listing" className="font-medium text-primary hover:underline">
                your region
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Buyers search directories when they need repair and rewinding
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              When a plant manager has a failed motor or a maintenance team needs a rewind quote, they don&apos;t always
              rely on a single vendor. They search for &quot;motor repair near me,&quot; &quot;electric motor
              rewinding,&quot; or &quot;industrial motor repair shop.&quot; A directory that focuses on electric motor
              repair and rewinding captures that intent and sends those leads to listed shops—so you&apos;re in the
              consideration set from day one.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That matters because purchase journeys often start with{" "}
              <strong className="text-title">category + geography</strong>, not your brand name. If your shop only
              appears when someone already knows you, you miss net-new facility accounts and smaller plants that rotate
              vendors by project.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Stand out without competing with general listings
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Generic business directories mix every industry. A motor-repair–specific directory highlights your
              capabilities—AC/DC repair, rewinding, VFD, pump, generator—and the industries you serve. That means
              better-qualified leads: people who need what you do, not random inquiries. You also avoid competing with
              unrelated businesses for the same keywords.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For comparison, browsing the{" "}
              <Link href="/marketplace" className="font-medium text-primary hover:underline">
                marketplace
              </Link>{" "}
              helps buyers find parts and equipment; the directory helps them find{" "}
              <strong className="text-title">your shop as a service provider</strong>. Many teams use both—directory for
              vendor selection, marketplace for surplus or specialty buys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Build credibility and local visibility
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              A complete profile—services, certifications, service area, and contact details—helps buyers compare shops
              and shortlist. Many use directories to verify that a shop exists, is legitimate, and offers the services
              they need. Being listed with consistent, accurate information supports both SEO and trust when buyers look
              you up later.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Align your directory name, address, and phone with your website and{" "}
              <strong className="text-title">Google Business Profile</strong> where possible. Consistency reduces
              confusion and strengthens local signals for “electric motor repair” and city-level searches.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Capture leads at the moment of need
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Directories that allow quote requests or contact forms turn searchers into leads. When someone submits a
              request through the directory, you get the inquiry while the need is hot. That&apos;s often more effective
              than waiting for cold traffic to find your website on its own—especially for emergency repair and
              time-sensitive jobs.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Pair visibility with operational follow-through: clear response-time expectations on your profile, a
              dedicated inbox owner, and a path into{" "}
              <Link href="/motor-repair-shop-management-software" className="font-medium text-primary hover:underline">
                shop management software
              </Link>{" "}
              so quotes do not stall after the first reply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              It is always free
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Listing your shop in our directory is <strong className="text-title">always free</strong>—no listing
              fees. You get a persistent presence that works for you over time, without the per-click cost of broad paid
              ads or heavy SEO spend. As the directory gains authority and ranks for terms like &quot;motor repair
              shops&quot; or &quot;rewinding services,&quot; your listing benefits from that visibility at no charge.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Think of it as <strong className="text-title">always-on discovery</strong>: not a replacement for your
              sales team, but a durable channel that supports outbound calls, referrals, and repeat customers when new
              buyers enter the market.
            </p>
          </section>

          <section className="not-prose mt-12 rounded-xl border border-border bg-gradient-to-br from-card to-bg p-6 sm:p-8">
            <h2 className="text-xl font-bold text-title sm:text-2xl">
              What to include on your motor repair shop profile
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-secondary">
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-title">Legal business name</strong> and consistent NAP (name, address, phone)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-title">Service radius</strong> or states/regions served (industrial travel)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-title">Core services</strong>: rewind, repair, balancing, machining, VFD, pump
                  motors
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-title">Industries</strong>: water, HVAC, oil &amp; gas, OEM, etc.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-title">Certifications</strong> and standards (where applicable)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong className="text-title">Photos</strong>: shop, test stand, winding room—builds trust fast
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-12">
              Directory + CRM: keep leads from going cold
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Visibility gets the conversation started; your process wins the job. MotorsWinding.com is built for motor
              repair centers that want{" "}
              <Link href="/features" className="font-medium text-primary hover:underline">
                quotes, work orders, and customer history
              </Link>{" "}
              in one system. When a directory inquiry arrives, you can move faster from first contact to scoped work
              without retyping data across spreadsheets.
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
            <h2 className="text-xl font-bold text-title sm:text-2xl">Ready to get listed?</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
                List your electric motor repair center
              </Link>{" "}
              and start receiving qualified leads. You can also{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                create an account
              </Link>{" "}
              to manage your listing and respond to inquiries in one place. Questions?{" "}
              <Link href="/contact" className="text-primary font-medium hover:underline">
                Contact us
              </Link>{" "}
              or review{" "}
              <Link href="/pricing" className="text-primary font-medium hover:underline">
                plans
              </Link>
              .
            </p>
            <p className="mt-4 text-sm text-secondary">
              Related:{" "}
              <Link href="/how-motor-repair-shops-get-more-customers" className="font-medium text-primary hover:underline">
                How motor repair shops get more customers
              </Link>{" "}
              ·{" "}
              <Link href="/benefits-of-motor-repair-directory" className="font-medium text-primary hover:underline">
                Benefits of a motor repair directory
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
