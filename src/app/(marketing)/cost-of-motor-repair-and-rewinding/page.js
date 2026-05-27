import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import CalculatorSidebarScrollGate from "@/components/marketing/calculator-sidebar-scroll-gate";
import MotorRewindCostCalculator from "@/components/marketing/motor-rewind-cost-calculator";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/cost-of-motor-repair-and-rewinding";

const COST_SIDEBAR_CALC_SCROLLABLE =
  "min-h-0 max-h-[min(34rem,calc(100dvh-6rem))] overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] md:max-h-[calc(100dvh-7.5rem)] md:pr-1";

export const metadata = {
  title: "Electric Motor Repair & Rewinding Cost Guide + Calculator (US)",
  description:
    "Electric motor repair cost, AC motor rewinding price, and industrial motor rewind estimates: US ballpark tables, HP-based pricing bands, what drives quotes, a free rewind cost calculator, FAQs, and how to compare shops on IQMotorBase.com.",
  keywords: [
    "motor repair cost",
    "electric motor repair cost",
    "motor rewinding cost",
    "electric motor rewinding cost",
    "AC motor rewind price",
    "DC motor repair cost",
    "industrial motor repair cost",
    "industrial motor rewinding price",
    "how much does motor rewinding cost",
    "motor rewind quote",
    "electric motor rebuild cost",
    "motor overhaul cost",
    "fractional HP motor repair cost",
    "medium voltage motor repair cost",
    "explosion proof motor repair cost",
    "motor repair labor rates",
    "emergency motor repair cost",
    "motor rewinding cost calculator",
    "electric motor repair near me cost",
    "submersible motor repair cost",
    "generator motor rewind cost",
    "motor bearing replacement cost",
    "motor repair vs rewind cost",
    "shop minimum motor repair charge",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  openGraph: {
    title: "Motor Repair & Rewinding Cost Guide + Calculator | IQMotorBase.com",
    description:
      "US ballpark motor repair and rewind pricing, HP tables, cost drivers, interactive calculator, and FAQs—plus how to get written quotes from repair centers.",
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Motor Repair & Rewinding Cost Guide | IQMotorBase.com",
    description:
      "Pricing tables, calculator, and FAQs for electric motor repair cost, rewinding, and industrial motor shop quotes in the US.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqItems = [
  {
    question: "How much does it cost to rewind an electric motor?",
    answer:
      "There is no single price. Small fractional-HP motors often run from a few hundred dollars up to roughly $1,000+ for a full rewind; medium motors (about 5–50 HP) commonly fall in the low thousands to several thousand; large industrial units (50+ HP) can reach tens of thousands. The only reliable number is a written quote after inspection.",
  },
  {
    question: "Is rewinding cheaper than buying a new motor?",
    answer:
      "Sometimes yes—especially for large or long-lead specialty motors—but not always. Compare the rewind quote to replacement cost, downtime, and efficiency. Use a structured repair vs. replace comparison (such as the IQMotorBase.com guide on when to repair or replace an electric motor) to decide when each option makes economic sense.",
  },
  {
    question: "Why do motor repair quotes vary between shops?",
    answer:
      "Shops differ in labor rates, material sources, testing included, warranty terms, and how they scope hidden damage. Always compare line items (labor, materials, testing, rush fees) and ask what is included. A practical checklist for vetting shops is available on IQMotorBase.com under how to choose an electric motor repair shop.",
  },
  {
    question: "What is usually included in a motor repair or rewind quote?",
    answer:
      "A good quote should spell out scope: inspection findings, labor, wire and insulation class, bearings or other parts, varnish or dip, balancing, and electrical tests (e.g. megger, surge, optional load test). Emergency or expedited work is often priced separately.",
  },
  {
    question: "How can I get an accurate motor rewind cost estimate?",
    answer:
      "Send photos, nameplate data (HP/kW, voltage, frame, RPM), and failure symptoms, but expect the final price after physical inspection. Use IQMotorBase.com to request quotes or browse repair centers by location and contact shops directly.",
  },
  {
    question: "What happens to the information I submit in quote requests?",
    answer:
      "Contact and motor details are used to route your request and support quote follow-up between you and relevant repair centers. Information is handled for service delivery and communication, not sold as a standalone contact database.",
  },
  {
    question: "What is the difference between motor repair cost and motor rewinding cost?",
    answer:
      "Motor repair cost is a broad term: it can mean bearings, seals, cleaning, balancing, or partial electrical work. Motor rewinding cost usually refers to stripping the stator (or armature), replacing magnet wire and insulation, re-varnishing or VPI, assembly, and full electrical test. Rewinds are typically the largest line item when burn-down or insulation failure is involved.",
  },
  {
    question: "How much does AC motor rewinding cost compared to DC motor repair?",
    answer:
      "Both are quoted from inspection. AC induction rewinds are common; pricing scales with copper, slots, and HP. DC motors add commutator, brush rig, and armature work—repairs and rewinds can be labor-heavy. Always compare apples-to-apples scope (armature vs stator only, field coils, mechanical fits) on the written estimate.",
  },
  {
    question: "Do shops charge a minimum or bench fee for small motor repair?",
    answer:
      "Yes, many US shops apply a minimum labor or bench charge for fractional-HP and small jobs because setup, teardown, and documentation time does not shrink with motor size. That is why small motor repair cost can look high relative to the copper value alone—ask how minimums apply before authorizing work.",
  },
  {
    question: "Does emergency or after-hours motor repair cost more?",
    answer:
      "Usually yes. Rush diagnostics, overtime labor, expedited materials, and weekend or holiday callouts are often billed at a premium. If uptime is costly, discuss expedite pricing and parallel paths (loaner, spare, swap) up front—see IQMotorBase.com emergency motor repair guidance.",
  },
  {
    question: "Is motor rewinding worth it for energy efficiency or upgrading to inverter duty?",
    answer:
      "Rewinding can restore reliability, but efficiency rules depend on duty, hours run, utility rates, and incentives. Inverter-duty upgrades, insulation class changes, or VPI may add cost but reduce future failure risk. Compare total cost of ownership against a new premium-efficiency motor using real quotes and payback math.",
  },
  {
    question: "Can ChatGPT or an online calculator replace a shop quote for motor rewinding?",
    answer:
      "No. AI assistants and calculators are useful for vocabulary, checklists, and ballpark budgeting—they cannot see slot damage, lamination condition, or bearing fits. Use this page’s calculator and tables for orientation, then obtain written quotes after inspection from qualified motor repair shops.",
  },
];

function CostPageFaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      id="schema-faq-cost-motor-repair"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function CostPageBreadcrumbJsonLd({ pageUrl, site }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      { "@type": "ListItem", position: 2, name: "Electric motor repair", item: `${site}/electric-motor-repair` },
      { "@type": "ListItem", position: 3, name: "Motor repair & rewinding cost", item: pageUrl },
    ],
  };
  return (
    <script
      id="schema-breadcrumb-cost-motor-repair"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function CostPageWebPageJsonLd({ pageUrl, site }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: "Cost of electric motor repair and rewinding (US guide)",
    description:
      "US-focused guide to electric motor repair cost, motor rewinding price drivers, reference pricing tables by horsepower, an interactive rewind cost calculator, and FAQs for buyers comparing shop quotes.",
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
    about: [
      { "@type": "Thing", name: "Electric motor repair" },
      { "@type": "Thing", name: "Motor rewinding" },
      { "@type": "Thing", name: "Industrial motor maintenance" },
    ],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#cost-guide-summary", "#motor-rewind-cost-calculator", "#reference-pricing-tables"],
    },
  };
  return (
    <script
      id="schema-webpage-cost-motor-repair"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function CostOfMotorRepairPage() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${path}`;

  const calculatorSpotlight = (
    <section
      id="motor-rewind-cost-calculator"
      className="not-prose"
      aria-labelledby="calc-spotlight-heading"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/45 bg-card shadow-2xl ring-1 ring-primary/15">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative border-b border-primary/15 bg-primary/[0.07] px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px] sm:tracking-[0.2em]">
            Interactive tool
          </p>
          <h2 id="calc-spotlight-heading" className="mt-2 text-xl font-bold tracking-tight text-title sm:text-2xl">
            Motor rewind &amp; repair cost calculator
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Get an instant <strong className="text-title">US ballpark range</strong> for{" "}
            <strong className="text-title">electric motor rewinding cost</strong>—then compare the tables and FAQs in
            the article with written quotes from shops after inspection.
          </p>
        </div>
        <div className="relative bg-card/80 px-2 py-4 sm:px-4 sm:py-5">
          <MotorRewindCostCalculator
            variant="full"
            fullHeadingAsH2
            compact
            calculatorSourcePage={path}
            requirePaidAccess
            allowGuestSingleUse
            showAllCalculatorsCta
          />
        </div>
      </div>
    </section>
  );

  const calculatorSidebar = (
    <CalculatorSidebarScrollGate
      sentinelId="cost-calculator-scroll-sentinel"
      activateBelowTopPx={96}
      scrollableClassName={COST_SIDEBAR_CALC_SCROLLABLE}
    >
      {calculatorSpotlight}
    </CalculatorSidebarScrollGate>
  );

  return (
    <>
      <CostPageFaqJsonLd />
      <CostPageBreadcrumbJsonLd pageUrl={pageUrl} site={site} />
      <CostPageWebPageJsonLd pageUrl={pageUrl} site={site} />
      <BlogPageLayout
        title="Cost of motor repair and rewinding"
        description="Electric motor repair cost and motor rewinding price depend on HP, damage, and scope. This US guide covers ballpark tables, a rewind calculator, quote tips, and FAQs—use it with our directory to compare real shop estimates."
        breadcrumbLink={{ href: "/electric-motor-repair-shops-listings", label: "Find repair centers" }}
        canonicalPath={path}
        sidebarBelowCta={calculatorSidebar}
        wideSidebar
        stickySidebar
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <span
            id="cost-calculator-scroll-sentinel"
            aria-hidden
            className="not-prose block h-px w-full max-w-full shrink-0 scroll-mt-24"
          />
          <section id="cost-guide-summary">
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-12">
              Typical US price ranges (ballpark only)
            </h2>
            <p className="mt-4 text-secondary">
              Use these bands for budgeting and conversations with shops—not as a guarantee. Currency, region, and motor
              condition change outcomes. Always insist on a{" "}
              <strong className="text-title">written quote</strong> after inspection.
            </p>
            <ul className="mt-6 list-none space-y-3 pl-0 text-secondary">
              <li>
                <strong className="text-title">Small motors (fractional to ~5 HP):</strong> Many repairs and rewinds fall
                from the low hundreds to about $1,000+, depending on rewind depth and parts.
              </li>
              <li>
                <strong className="text-title">Medium motors (~5–50 HP):</strong> Common to see roughly $1,000 through
                several thousand for rewind-level work or major repairs.
              </li>
              <li>
                <strong className="text-title">Large industrial (50 HP and up):</strong> Often several thousand to tens of
                thousands for full rewinds, extensive mechanical work, or critical spares with tight schedules.
              </li>
            </ul>
            <p className="mt-6 text-secondary">
              Comparing two or three quotes from shops you trust is still the best way to understand fair market price
              for <em>your</em> motor. Our{" "}
              <Link href="/how-to-choose-electric-motor-repair-shop" className="text-primary font-medium hover:underline">
                how to choose a motor repair shop
              </Link>{" "}
              guide lists questions to ask so you compare apples to apples.
            </p>
          </section>

          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">
              What affects the cost of motor repair and rewinding?
            </h2>
            <p className="mt-4 text-secondary">
              No two jobs are identical. Qualified shops price from nameplate data, inspection, and scope of work.
              Understanding the drivers below helps you read a quote and budget realistically—whether you need a{" "}
              <Link href="/types-of-electric-motor-repair-services" className="text-primary font-medium hover:underline">
                minor repair
              </Link>{" "}
              or a full rewind.
            </p>

            <ul className="mt-8 space-y-6 list-none pl-0">
              <li>
                <h3 className="text-lg font-semibold text-title">Motor size and horsepower (HP / kW)</h3>
                <p className="mt-2 text-secondary">
                  Larger motors use more copper, insulation, and bench time. Small fractional-HP units may be a few
                  hundred dollars to service; large industrial machines (for example 500 HP and up) routinely reach
                  thousands to tens of thousands for a full rewind. Frame size, core length, and kW rating usually move
                  the number more than brand alone.
                </p>
              </li>
              <li>
                <h3 className="text-lg font-semibold text-title">Repair vs. rewind scope</h3>
                <p className="mt-2 text-secondary">
                  Bearing replacement, cleaning, balancing, or targeted electrical work typically costs less than
                  stripping and rewinding with new wire, insulation system, varnish or VPI, and full electrical testing.
                  If you are unsure which path fits, see{" "}
                  <Link href="/when-to-repair-or-replace-electric-motor" className="text-primary font-medium hover:underline">
                    when to repair or replace a motor
                  </Link>{" "}
                  and{" "}
                  <Link href="/types-of-electric-motor-repair-services" className="text-primary font-medium hover:underline">
                    types of repair services
                  </Link>
                  .
                </p>
              </li>
              <li>
                <h3 className="text-lg font-semibold text-title">Condition and hidden damage</h3>
                <p className="mt-2 text-secondary">
                  Burned slots, damaged laminations, bad fits, or contamination add labor and parts. Reputable shops often
                  quote after tear-down so the estimate matches reality. Ask what happens if additional damage is found.
                </p>
              </li>
              <li>
                <h3 className="text-lg font-semibold text-title">Voltage, enclosure, and motor type</h3>
                <p className="mt-2 text-secondary">
                  High voltage, explosion-proof, washdown, vertical, DC, or custom designs can require different materials,
                  processes, and compliance checks—all reflected in price. Single-phase vs. three-phase and specialty
                  windings also change labor hours.
                </p>
              </li>
              <li>
                <h3 className="text-lg font-semibold text-title">Labor, parts, testing, and turnaround</h3>
                <p className="mt-2 text-secondary">
                  Regional labor rates, OEM vs. aftermarket parts, and included tests (megger, surge, hi-pot, balancing)
                  vary by shop.{" "}
                  <Link href="/emergency-motor-repair-what-to-do" className="text-primary font-medium hover:underline">
                    Emergency or rush work
                  </Link>{" "}
                  often carries a premium. Align expectations up front: what is included, what is extra, and typical lead
                  time.
                </p>
              </li>
            </ul>
          </section>

          <section className="mt-12 border-t border-border pt-12 not-prose" id="reference-pricing-tables">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">
              Reference pricing tables (US ballpark only)
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
              These <strong className="text-title">electric motor repair cost</strong> and{" "}
              <strong className="text-title">rewinding price</strong> tables summarize typical US shop conversations—not
              guarantees. Currency, region, motor condition, and scope change every job. Always insist on a{" "}
              <strong className="text-title">written quote after inspection</strong>.
            </p>

            <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <caption className="border-b border-border bg-card px-4 py-3 text-left text-sm font-semibold text-title">
                  Table 1 — Typical full rewind labor + materials (single location, standard turnaround)
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-secondary">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Motor class (approx. HP)
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Typical US ballpark rewind
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Notes for buyers
                    </th>
                  </tr>
                </thead>
                <tbody className="text-secondary">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Fractional to ~3 HP</td>
                    <td className="px-4 py-3 tabular-nums">~$250–$900+</td>
                    <td className="px-4 py-3">Shop minimums and bench fees often dominate small motor rewinding cost.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">~5–15 HP</td>
                    <td className="px-4 py-3 tabular-nums">~$900–$3,500</td>
                    <td className="px-4 py-3">Common AC industrial sizes; verify testing and varnish/VPI scope.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">~20–50 HP</td>
                    <td className="px-4 py-3 tabular-nums">~$2,500–$9,000+</td>
                    <td className="px-4 py-3">Copper weight, slots, and enclosure (TEFC vs ODP) swing totals.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">~60–150 HP</td>
                    <td className="px-4 py-3 tabular-nums">~$6,000–$25,000+</td>
                    <td className="px-4 py-3">Expect formal documentation, balancing, and load or surge testing options.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-title">150+ HP / medium voltage</td>
                    <td className="px-4 py-3 tabular-nums">Often $15k–$60k+</td>
                    <td className="px-4 py-3">Custom insulation systems, rigging, and outage windows drive industrial motor repair cost.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <caption className="border-b border-border bg-card px-4 py-3 text-left text-sm font-semibold text-title">
                  Table 2 — Common add-on line items (priced separately by many shops)
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-secondary">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Service add-on
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Typical US range
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      When it applies
                    </th>
                  </tr>
                </thead>
                <tbody className="text-secondary">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Bearing &amp; seal replacement</td>
                    <td className="px-4 py-3 tabular-nums">~$150–$1,200+</td>
                    <td className="px-4 py-3">Often bundled with mechanical rebuild alongside rewind or repair.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Dynamic balance (shop)</td>
                    <td className="px-4 py-3 tabular-nums">~$200–$2,500+</td>
                    <td className="px-4 py-3">Larger rotors; critical for high RPM or precision driven equipment.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">VPI or premium impregnation upgrade</td>
                    <td className="px-4 py-3 tabular-nums">~$400–$5,000+</td>
                    <td className="px-4 py-3">Harsh environments, inverter-duty, or specification upgrades.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Expedited / weekend turnaround</td>
                    <td className="px-4 py-3 tabular-nums">10–50%+ premium</td>
                    <td className="px-4 py-3">Overtime, queue jumping, and rush materials—confirm in writing.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-title">Teardown + inspection fee (if not waived)</td>
                    <td className="px-4 py-3 tabular-nums">~$75–$500+</td>
                    <td className="px-4 py-3">Sometimes credited toward repair if you proceed; ask up front.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <caption className="border-b border-border bg-card px-4 py-3 text-left text-sm font-semibold text-title">
                  Table 3 — Service type vs. typical spend (relative guide)
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-secondary">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Service type
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Relative motor repair cost
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Buyer takeaway
                    </th>
                  </tr>
                </thead>
                <tbody className="text-secondary">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Clean, dip, test (no rewind)</td>
                    <td className="px-4 py-3">Lower</td>
                    <td className="px-4 py-3">Good when windings test acceptable and failure was environmental or single-event.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Partial rewind / pole or coil repair</td>
                    <td className="px-4 py-3">Moderate</td>
                    <td className="px-4 py-3">Scoped damage only; confirm warranty and surge test coverage.</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">Full stator rewind + mechanical rebuild</td>
                    <td className="px-4 py-3">Higher</td>
                    <td className="px-4 py-3">Most common “major” electric motor rewinding cost path after insulation failure.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-title">DC armature + field + mechanical</td>
                    <td className="px-4 py-3">Variable / often high labor</td>
                    <td className="px-4 py-3">Compare full scope vs. replacement—especially for smaller DC frames.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">
              How to get an accurate quote (and lower surprise costs)
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-secondary">
              <li>
                Photograph the nameplate (HP/kW, volts, amps, frame, RPM, enclosure) and note failure symptoms (tripping,
                heat, noise, environment).
              </li>
              <li>
                Use{" "}
                <Link href="/electric-motor-repair-shops-listings" className="text-primary font-medium hover:underline">
                  find repair shops
                </Link>{" "}
                or{" "}
                <Link href="/electric-motor-repair-near-me" className="text-primary font-medium hover:underline">
                  repair near me
                </Link>{" "}
                to shortlist shops that serve your area or industry.
              </li>
              <li>
                Ask what inspection costs (if any), what is included in the quote, and how change orders are handled if
                more damage appears during tear-down.
              </li>
              <li>
                If downtime is expensive, discuss expedite options early—see{" "}
                <Link href="/emergency-motor-repair-what-to-do" className="text-primary font-medium hover:underline">
                  emergency motor repair
                </Link>
                .
              </li>
            </ol>
            <p className="mt-6 text-secondary">
              You can also{" "}
              <Link href="/contact" className="text-primary font-medium hover:underline">
                contact IQMotorBase.com
              </Link>{" "}
              with your requirement so we can help route you to centers that quote your type of work.
            </p>
          </section>

          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">For repair shop owners</h2>
            <p className="mt-4 text-secondary">
              If you run a motor repair or rewinding center, accurate quoting and job tracking protect margin and
              customer trust. IQMotorBase.com offers{" "}
              <Link href="/motor-repair-shop-management-software" className="text-primary font-medium hover:underline">
                shop management software
              </Link>
              ,{" "}
              <Link href="/track-motor-repair-jobs" className="text-primary font-medium hover:underline">
                job tracking
              </Link>
              , and{" "}
              <Link href="/how-motor-repair-shops-get-more-customers" className="text-primary font-medium hover:underline">
                lead generation
              </Link>
              .{" "}
              <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
                List your shop
              </Link>{" "}
              to appear in buyer searches alongside your services.
            </p>
          </section>

          <section className="mt-12 border-t border-border pt-12" id="faq">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">Frequently asked questions</h2>

            <dl className="mt-6 space-y-8">
              {faqItems.map((item) => (
                <div key={item.question}>
                  <dt className="text-lg font-semibold text-title">{item.question}</dt>
                  <dd className="mt-2 text-secondary">{item.answer}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-sm text-secondary">
              For career seekers: open roles from member shops are listed on our{" "}
              <Link href="/careers" className="text-primary font-medium hover:underline">
                Careers
              </Link>{" "}
              page.
            </p>
          </section>

          <section className="not-prose mt-12 rounded-xl border border-primary/20 bg-primary/[0.04] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-title sm:text-2xl">Next steps</h2>
            <p className="mt-3 text-secondary">
              Ready to move from estimates to action? Browse centers, compare guidance above, and reach out for numbers
              you can plan around.
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-sm font-medium">
              <li>
                <Link href="/electric-motor-repair-shops-listings" className="text-primary hover:underline">
                  → Browse repair centers by location
                </Link>
              </li>
              <li>
                <Link href="/electric-motor-repair-near-me" className="text-primary hover:underline">
                  → Motor repair shops near me
                </Link>
              </li>
              <li>
                <Link href="/when-to-repair-or-replace-electric-motor" className="text-primary hover:underline">
                  → Should you repair or replace?
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-primary hover:underline">
                  → Request a quote via IQMotorBase.com
                </Link>
              </li>
            </ul>
          </section>

          <section className="not-prose mt-12 rounded-xl border border-border bg-card/50 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-title">Related guides</h2>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <li>
                <Link href="/when-to-repair-or-replace-electric-motor" className="text-primary hover:underline">
                  Repair vs. replace a motor
                </Link>
                <span className="text-secondary"> — economics and downtime</span>
              </li>
              <li>
                <Link href="/how-to-choose-electric-motor-repair-shop" className="text-primary hover:underline">
                  How to choose a repair shop
                </Link>
                <span className="text-secondary"> — compare quotes fairly</span>
              </li>
              <li>
                <Link href="/types-of-electric-motor-repair-services" className="text-primary hover:underline">
                  Types of motor repair services
                </Link>
                <span className="text-secondary"> — rewind, bearing work, testing</span>
              </li>
              <li>
                <Link href="/emergency-motor-repair-what-to-do" className="text-primary hover:underline">
                  Emergency motor repair
                </Link>
                <span className="text-secondary"> — when rush premiums apply</span>
              </li>
              <li>
                <Link href="/electric-motor-repair" className="text-primary hover:underline">
                  Electric motor repair overview
                </Link>
                <span className="text-secondary"> — hub for buyers</span>
              </li>
              <li>
                <Link href="/electric-motor-repair-near-me" className="text-primary hover:underline">
                  Motor repair near me
                </Link>
                <span className="text-secondary"> — local intent</span>
              </li>
              <li>
                <Link href="/marketplace" className="text-primary hover:underline">
                  Parts &amp; equipment marketplace
                </Link>
                <span className="text-secondary"> — surplus motors &amp; parts</span>
              </li>
              <li>
                <Link href="/usa/motor-repair-business-listing" className="text-primary hover:underline">
                  USA motor repair business listings
                </Link>
                <span className="text-secondary"> — shops by state &amp; city</span>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
