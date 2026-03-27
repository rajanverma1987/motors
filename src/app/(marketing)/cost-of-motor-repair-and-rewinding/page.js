import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import CostPageCta from "./cost-page-cta";

const path = "/cost-of-motor-repair-and-rewinding";

export const metadata = {
  title: "Electric Motor Repair & Rewinding Cost Guide (US)",
  description:
    "How much does electric motor repair or rewinding cost? Factors that drive price, typical US ballpark ranges, how to compare quotes, and links to find qualified repair centers on MotorsWinding.com.",
  keywords: [
    "motor repair cost",
    "motor rewinding cost",
    "electric motor repair price",
    "how much does motor rewinding cost",
    "industrial motor repair cost",
    "motor rewind quote",
    "AC motor repair cost",
    "DC motor rewind price",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Electric Motor Repair & Rewinding Cost Guide | MotorsWinding.com",
    description:
      "What drives motor repair and rewind pricing, typical US price bands, and how to get accurate quotes from repair centers.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Electric Motor Repair & Rewinding Cost Guide | MotorsWinding.com",
    description: "Factors, ballpark ranges, and how to compare motor repair quotes.",
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
      "Sometimes yes—especially for large or long-lead specialty motors—but not always. Compare the rewind quote to replacement cost, downtime, and efficiency. Use a structured repair vs. replace comparison (such as the MotorsWinding.com guide on when to repair or replace an electric motor) to decide when each option makes economic sense.",
  },
  {
    question: "Why do motor repair quotes vary between shops?",
    answer:
      "Shops differ in labor rates, material sources, testing included, warranty terms, and how they scope hidden damage. Always compare line items (labor, materials, testing, rush fees) and ask what is included. A practical checklist for vetting shops is available on MotorsWinding.com under how to choose an electric motor repair shop.",
  },
  {
    question: "What is usually included in a motor repair or rewind quote?",
    answer:
      "A good quote should spell out scope: inspection findings, labor, wire and insulation class, bearings or other parts, varnish or dip, balancing, and electrical tests (e.g. megger, surge, optional load test). Emergency or expedited work is often priced separately.",
  },
  {
    question: "How can I get an accurate motor rewind cost estimate?",
    answer:
      "Send photos, nameplate data (HP/kW, voltage, frame, RPM), and failure symptoms, but expect the final price after physical inspection. Use MotorsWinding.com to request quotes or browse repair centers by location and contact shops directly.",
  },
  {
    question: "What happens to the information I submit in quote requests?",
    answer:
      "Contact and motor details are used to route your request and support quote follow-up between you and relevant repair centers. Information is handled for service delivery and communication, not sold as a standalone contact database.",
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

export default function CostOfMotorRepairPage() {
  return (
    <>
      <CostPageFaqJsonLd />
      <BlogPageLayout
        title="Cost of motor repair and rewinding"
        description="Electric motor repair and rewinding costs depend on motor size, type of work, and condition. This guide explains what drives price in the US, typical ballpark ranges, how to compare quotes, and where to find qualified centers—without replacing advice from your shop."
        breadcrumbLink={{ href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" }}
        canonicalPath={path}
        sidebarTitle="Get a quote"
        sidebarDescription="Tell us about your motor and location. We can connect you with repair centers that quote rewinds, repairs, and emergency work."
        sidebarCta={<CostPageCta />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-secondary not-prose">
            If you are searching for{" "}
            <strong className="text-title">motor repair cost</strong>,{" "}
            <strong className="text-title">motor rewinding cost</strong>, or{" "}
            <strong className="text-title">industrial motor repair pricing</strong>, start here. Use this page with our{" "}
            <Link href="/electric-motor-reapir-shops-listings" className="text-primary font-medium hover:underline">
              directory of repair centers
            </Link>
            ,{" "}
            <Link href="/electric-motor-reapir-near-me" className="text-primary font-medium hover:underline">
              shops near you
            </Link>
            , and{" "}
            <Link href="/contact" className="text-primary font-medium hover:underline">
              quote request
            </Link>{" "}
            to move from ballpark numbers to a real estimate.
          </p>

          <section className="not-prose mt-10 rounded-xl border border-border bg-card/50 p-5 sm:p-6">
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
                <Link href="/electric-motor-reapir-near-me" className="text-primary hover:underline">
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

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-12">
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

          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">
              Typical US price ranges (ballpark only)
            </h2>
            <p className="mt-4 text-secondary">
              Use these bands for budgeting and conversations with shops—not as a guarantee. Currency, region, and motor
              condition change outcomes. Always insist on a{" "}
              <strong className="text-title">written quote</strong> after inspection.
            </p>
            <ul className="mt-6 space-y-3 text-secondary">
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
              How to get an accurate quote (and lower surprise costs)
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-secondary">
              <li>
                Photograph the nameplate (HP/kW, volts, amps, frame, RPM, enclosure) and note failure symptoms (tripping,
                heat, noise, environment).
              </li>
              <li>
                Use{" "}
                <Link href="/electric-motor-reapir-shops-listings" className="text-primary font-medium hover:underline">
                  find repair centers
                </Link>{" "}
                or{" "}
                <Link href="/electric-motor-reapir-near-me" className="text-primary font-medium hover:underline">
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
                contact MotorsWinding.com
              </Link>{" "}
              with your requirement so we can help route you to centers that quote your type of work.
            </p>
          </section>

          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">For repair shop owners</h2>
            <p className="mt-4 text-secondary">
              If you run a motor repair or rewinding center, accurate quoting and job tracking protect margin and
              customer trust. MotorsWinding.com offers{" "}
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

          <section className="mt-12 border-t border-border pt-12">
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
                <Link href="/electric-motor-reapir-shops-listings" className="text-primary hover:underline">
                  → Browse repair centers by location
                </Link>
              </li>
              <li>
                <Link href="/electric-motor-reapir-near-me" className="text-primary hover:underline">
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
                  → Request a quote via MotorsWinding.com
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
