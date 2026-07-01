import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import CalculatorSidebarScrollGate from "@/components/marketing/calculator-sidebar-scroll-gate";
import GetQuoteCta from "@/components/marketing/GetQuoteCta";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";
import MotorRewindCostCalculator from "@/components/marketing/motor-rewind-cost-calculator";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/industrial-motor-repair";

const CALC_SIDEBAR_SCROLLABLE =
  "min-h-0 max-h-[min(34rem,calc(100dvh-6rem))] overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] md:max-h-[calc(100dvh-7.5rem)] md:pr-1";

export const metadata = {
  title: "Industrial Motor Repair Services, Costs & Shop Finder (2026 Guide)",
  description:
    "Industrial motor repair explained: AC/DC rewinding, medium-voltage work, pump & fan motors, testing, and US cost ballparks. Find qualified shops, use the free rewind calculator, and request quotes on IQMotorBase.com.",
  keywords: [
    "industrial motor repair",
    "industrial motor repair near me",
    "industrial electric motor repair",
    "industrial motor rewinding",
    "industrial motor repair services",
    "industrial motor repair cost",
    "medium voltage motor repair",
    "large motor rewind",
    "factory motor repair",
    "plant motor repair",
    "industrial AC motor repair",
    "industrial DC motor repair",
    "motor repair shop industrial",
    "industrial motor rebuild",
    "industrial motor testing",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  openGraph: {
    title: "Industrial Motor Repair — Services, Costs & Shop Finder | IQMotorBase.com",
    description:
      "Guide to industrial motor repair and rewinding: service types, cost drivers, how to choose a shop, free calculator, and directory links.",
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Industrial Motor Repair Guide | IQMotorBase.com",
    description:
      "Services, costs, shop selection, and free rewind calculator for industrial electric motor repair.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqItems = [
  {
    question: "What is industrial motor repair?",
    answer:
      "Industrial motor repair is the inspection, mechanical rebuild, electrical rewind, testing, and re-commissioning of motors used in factories, utilities, water treatment, mining, HVAC plants, and other continuous-duty applications—typically from a few horsepower up to multi-megawatt units. Work is performed by specialized motor repair and rewinding shops with the cranes, ovens, VPI systems, and test equipment large jobs require.",
  },
  {
    question: "What types of industrial motors do repair shops work on?",
    answer:
      "Common categories include three-phase AC induction motors (TEFC, ODP, severe duty), DC motors and mill-duty units, medium-voltage motors, synchronous and wound-rotor machines, pump and fan motors, compressor and extruder drives, submersible and vertical hollow-shaft pumps, and explosion-proof or hazardous-location motors. Always match the shop’s published capabilities to your nameplate voltage, frame, and duty class.",
  },
  {
    question: "How much does industrial motor repair cost?",
    answer:
      "Cost scales with horsepower, voltage class, copper and insulation work, mechanical damage, and testing scope. Small industrial jobs may start in the low thousands; large rewinds and medium-voltage work often reach tens of thousands. Use IQMotorBase.com’s motor rewind cost calculator for a US ballpark range, then obtain written quotes after physical inspection—see the motor repair cost guide for pricing tables and line-item comparisons.",
  },
  {
    question: "Is rewinding or replacing better for an industrial motor?",
    answer:
      "It depends on lead time for a new motor, efficiency goals, lamination condition, shaft or frame damage, and total downtime cost. Rewinding can restore reliability for large or specialty units; replacement may win when a premium-efficiency motor pays back quickly. Compare repair quotes, replacement price, and uptime using a structured repair-vs-replace framework before authorizing work.",
  },
  {
    question: "What testing should an industrial motor repair shop perform?",
    answer:
      "Expect insulation resistance (megger), surge comparison, high-potential where appropriate, vibration analysis, balancing, and no-load or loaded tests when specified. For critical equipment, ask which tests are included in the quote, which are optional, and how results are documented before the motor ships.",
  },
  {
    question: "How do I find industrial motor repair near me?",
    answer:
      "Search by city or ZIP in the IQMotorBase.com repair center directory, filter by services and voltage class where listed, and contact two or three shops with your nameplate data and photos. The near-me page and quote request form help route RFQs to shops that can respond with scope and pricing.",
  },
  {
    question: "What certifications matter for industrial motor repair?",
    answer:
      "EASA membership, ISO quality systems, UL repair programs, and factory-authorized status signal documented processes—but they are not a substitute for application experience. For regulated or hazardous locations, confirm the shop’s history with your motor type and ask for references on similar HP and voltage class.",
  },
  {
    question: "Can I get a rush or emergency industrial motor repair?",
    answer:
      "Many shops offer expedited diagnostics and overtime rewinds at a premium. Document failure symptoms, arrange safe transport or field removal, and ask about parallel paths (loaner, spare, swap) while the primary unit is in the shop. Emergency timelines and premiums are covered in IQMotorBase.com’s emergency motor repair guide.",
  },
];

function IndustrialMotorRepairFaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <script
      id="schema-faq-industrial-motor-repair"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function IndustrialMotorRepairBreadcrumbJsonLd({ pageUrl, site }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      { "@type": "ListItem", position: 2, name: "Electric motor repair", item: `${site}/electric-motor-repair` },
      { "@type": "ListItem", position: 3, name: "Industrial motor repair", item: pageUrl },
    ],
  };
  return (
    <script
      id="schema-breadcrumb-industrial-motor-repair"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function IndustrialMotorRepairWebPageJsonLd({ pageUrl, site }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: "Industrial motor repair — services, costs & shop finder",
    description:
      "Buyer guide to industrial electric motor repair and rewinding: service types, cost drivers, shop selection, calculator, and directory links.",
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
    about: [
      { "@type": "Thing", name: "Industrial motor repair" },
      { "@type": "Thing", name: "Motor rewinding" },
      { "@type": "Thing", name: "Electric motor maintenance" },
    ],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#industrial-motor-repair-summary", "#industrial-motor-repair-faq"],
    },
  };
  return (
    <script
      id="schema-webpage-industrial-motor-repair"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function IndustrialMotorRepairPage() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${path}`;

  const calculatorSpotlight = (
    <section
      id="industrial-motor-rewind-calculator"
      className="not-prose"
      aria-labelledby="industrial-calc-heading"
    >
      <div className="overflow-hidden rounded-xl border border-primary/30 bg-card shadow-sm ring-1 ring-primary/10">
        <div className="border-b border-primary/15 bg-primary/[0.06] px-4 py-3 sm:px-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Free tool</p>
          <h2 id="industrial-calc-heading" className="mt-1 text-base font-bold text-title sm:text-lg">
            Industrial motor rewind cost calculator
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            Ballpark US rewind pricing by HP—then compare with shop quotes after inspection.
          </p>
        </div>
        <div className="bg-card/80 px-0 py-0 sm:px-3 sm:py-3">
          <MotorRewindCostCalculator
            variant="full"
            fullHeadingAsH2
            compact
            flushMobilePadding
            calculatorSourcePage={path}
          />
        </div>
        <div className="border-t border-border px-4 py-3 text-center">
          <Link
            href="/electric-motor-rewinding-cost-calculator"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open full-screen calculator →
          </Link>
        </div>
      </div>
    </section>
  );

  const calculatorSidebar = (
    <CalculatorSidebarScrollGate
      sentinelId="industrial-calc-scroll-sentinel"
      activateBelowTopPx={96}
      scrollableClassName={CALC_SIDEBAR_SCROLLABLE}
    >
      {calculatorSpotlight}
    </CalculatorSidebarScrollGate>
  );

  return (
    <>
      <IndustrialMotorRepairFaqJsonLd />
      <IndustrialMotorRepairBreadcrumbJsonLd pageUrl={pageUrl} site={site} />
      <IndustrialMotorRepairWebPageJsonLd pageUrl={pageUrl} site={site} />
      <BlogPageLayout
        title="Industrial motor repair: services, costs & how to find a qualified shop"
        description="When plant equipment stops, industrial motor repair decisions affect uptime, safety, and budget. This guide covers common motor types, repair services, cost drivers, shop selection, and tools to get quotes faster."
        breadcrumbLink={{ href: "/electric-motor-repair", label: "Electric motor repair hub" }}
        canonicalPath={path}
        sidebarTitle="Get industrial motor repair quotes"
        sidebarDescription="Submit nameplate details and failure notes—we connect you with repair centers that quote your HP, voltage, and application. Or browse shops by location."
        sidebarCta={<GetQuoteCta />}
        sidebarBelowCta={calculatorSidebar}
        wideSidebar
        stickySidebar
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <p id="industrial-motor-repair-summary" className="text-lg text-secondary leading-relaxed">
            <strong className="text-title">Industrial motor repair</strong> keeps factories, utilities, water plants,
            and processing lines running when drives fail. Unlike light commercial work, plant motors often involve
            higher horsepower, medium voltage, severe-duty enclosures, and documentation requirements that only
            experienced rewinding shops can handle. Use this page to understand what qualified shops do, what drives
            price, and how to reach them through IQMotorBase.com&apos;s{" "}
            <Link href="/electric-motor-repair-shops-listings" className="text-primary font-medium hover:underline">
              repair center directory
            </Link>{" "}
            and{" "}
            <Link href="/electric-motor-rewinding-cost-calculator" className="text-primary font-medium hover:underline">
              rewind cost calculator
            </Link>
            .
          </p>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              What counts as industrial motor repair?
            </h2>
            <p className="mt-4 text-secondary">
              Industrial motor repair is any work that restores a production-critical motor to safe, reliable
              operation—mechanical fits, electrical insulation, balancing, and acceptance testing. Shops may perform
              bearing and seal replacement, shaft repair, lamination treatment, full stator or armature rewinds,
              VPI (vacuum pressure impregnation), commutation work on DC machines, and field service for alignment or
              removal. The scope depends on failure mode: a grounded winding needs different work than a bent shaft or
              contaminated bearings. For a service-by-service overview, see{" "}
              <Link href="/types-of-electric-motor-repair-services" className="text-primary font-medium hover:underline">
                types of electric motor repair services
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Common industrial motor types &amp; applications
            </h2>
            <p className="mt-4 text-secondary">
              Facilities teams most often send these categories to motor shops:
            </p>
            <ul className="mt-4 list-disc pl-6 text-secondary space-y-2">
              <li>
                <strong className="text-title">Three-phase AC induction</strong> — pumps, fans, conveyors, compressors
                (TEFC, ODP, IEEE 841 / severe duty)
              </li>
              <li>
                <strong className="text-title">Medium-voltage motors</strong> — higher insulation and test requirements;
                confirm shop capability before shipping
              </li>
              <li>
                <strong className="text-title">DC &amp; mill-duty motors</strong> — armature, commutator, and field coil
                work; often longer lead times
              </li>
              <li>
                <strong className="text-title">Synchronous &amp; wound-rotor</strong> — specialty rewinds and controls
                integration
              </li>
              <li>
                <strong className="text-title">Explosion-proof &amp; hazardous location</strong> — documentation and
                recertification matter for regulated sites
              </li>
              <li>
                <strong className="text-title">Vertical hollow-shaft &amp; submersible</strong> — common in water /
                wastewater; shops need appropriate handling and test stands
              </li>
            </ul>
            <p className="mt-4 text-secondary">
              Match the shop to your nameplate: HP or kW, voltage, frame, RPM, enclosure, and duty. Our{" "}
              <Link href="/how-to-choose-electric-motor-repair-shop" className="text-primary font-medium hover:underline">
                buyer&apos;s guide to choosing a repair shop
              </Link>{" "}
              walks through capabilities, testing, and certifications in more detail.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Typical industrial motor repair services
            </h2>
            <p className="mt-4 text-secondary">
              A qualified industrial motor repair shop usually offers some combination of:
            </p>
            <ul className="mt-4 list-disc pl-6 text-secondary space-y-2">
              <li>Incoming inspection, failure analysis, and photo documentation</li>
              <li>Bearing, seal, and coupling replacement; shaft straightening or replacement</li>
              <li>Stator or armature rewind with specified wire and insulation class</li>
              <li>Dip-and-bake or VPI for moisture and contamination resistance</li>
              <li>Dynamic balancing and vibration analysis</li>
              <li>Electrical tests: megger, surge, hi-pot (where applicable), no-load run</li>
              <li>Field service: removal, installation support, laser alignment partners</li>
            </ul>
            <p className="mt-4 text-secondary">
              Ask for a written quote that lists each line item so you can compare shops fairly. Rush and after-hours
              work is often priced separately—see{" "}
              <Link href="/emergency-motor-repair-what-to-do" className="text-primary font-medium hover:underline">
                emergency motor repair: what to do first
              </Link>{" "}
              if downtime is costly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Industrial motor repair cost: what moves the number
            </h2>
            <p className="mt-4 text-secondary">
              Price is not a single rate per HP. Major drivers include copper and insulation materials, slot count and
              voltage class, extent of mechanical damage, required tests, expedite fees, and freight for oversized
              frames. Large industrial rewinds routinely reach five figures; medium-voltage and specialty enclosures
              add scope. Use the{" "}
              <Link href="/electric-motor-rewinding-cost-calculator" className="text-primary font-medium hover:underline">
                motor rewind cost calculator
              </Link>{" "}
              on this page for a US ballpark range, then read the{" "}
              <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
                motor repair &amp; rewinding cost guide
              </Link>{" "}
              for HP tables and FAQs. Only a shop quote after inspection is binding.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Repair, rewind, or replace?
            </h2>
            <p className="mt-4 text-secondary">
              For large or long-lead motors, rewinding often beats waiting months for a replacement. For smaller or
              heavily damaged units, a new premium-efficiency motor may pay back faster when run hours are high.
              Compare total cost of ownership—repair quote, replacement price, installation, efficiency incentives, and
              downtime—not just the lowest line item. The{" "}
              <Link href="/when-to-repair-or-replace-electric-motor" className="text-primary font-medium hover:underline">
                repair vs. replace guide
              </Link>{" "}
              gives a practical framework for that decision.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              How to find industrial motor repair near you
            </h2>
            <p className="mt-4 text-secondary">
              Start with location and capability, not just the closest pin on a map. Search the{" "}
              <Link href="/electric-motor-repair-shops-listings" className="text-primary font-medium hover:underline">
                electric motor repair directory
              </Link>{" "}
              by city or state, use the{" "}
              <Link href="/electric-motor-repair-near-me" className="text-primary font-medium hover:underline">
                repair shops near me
              </Link>{" "}
              page for local intent, and request quotes with nameplate photos and failure symptoms. Comparing two or
              three written estimates helps balance price, turnaround, and test scope. Need surplus spares while a
              motor is in the shop? Browse the{" "}
              <Link href="/marketplace" className="text-primary font-medium hover:underline">
                parts &amp; equipment marketplace
              </Link>
              .
            </p>
          </section>

          <section
            id="industrial-motor-repair-faq"
            className="not-prose rounded-xl border border-border bg-card/60 p-5 sm:p-6 mt-12"
            aria-labelledby="faq-heading"
          >
            <h2 id="faq-heading" className="text-xl font-bold text-title sm:text-2xl">
              Industrial motor repair — frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.question}>
                  <dt className="font-semibold text-title">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-secondary">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <MarketingRelatedGuides excludeHref={path} className="mt-12" />

          <section className="not-prose rounded-xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6 mt-12">
            <h2 className="text-xl font-bold text-title">Ready for quotes?</h2>
            <p className="mt-2 text-sm text-secondary">
              Request industrial motor repair quotes, browse qualified shops, or run the rewind calculator for a
              ballpark budget before you ship the motor.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/contact" className="font-medium text-primary hover:underline">
                  Request a quote
                </Link>
                <span className="text-secondary"> — we route RFQs to capable shops</span>
              </li>
              <li>
                <Link href="/electric-motor-repair-shops-listings" className="font-medium text-primary hover:underline">
                  Find repair centers
                </Link>
                <span className="text-secondary"> — directory by location and services</span>
              </li>
              <li>
                <Link href="/electric-motor-rewinding-cost-calculator" className="font-medium text-primary hover:underline">
                  Motor rewind cost calculator
                </Link>
                <span className="text-secondary"> — free US ballpark by HP</span>
              </li>
              <li>
                <Link href="/electric-motor-repair" className="font-medium text-primary hover:underline">
                  Electric motor repair hub
                </Link>
                <span className="text-secondary"> — all buyer guides in one place</span>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
