import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import RepairRequestForm from "@/components/marketing/repair-request-form";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/rewind-vs-surplus-motor-replacement";

export const metadata = {
  title: "Rewind vs Surplus Motor | Which Is Cheaper? | IQMotorBase",
  description:
    "Is it cheaper to rewind an industrial motor or buy a surplus replacement? A straight comparison of cost, risk, lead time, and warranty, with a form to get a rewind quote.",
  keywords: [
    "rewind vs surplus motor",
    "is it cheaper to rewind a motor",
    "surplus motor vs rewind",
    "industrial motor rewind cost",
    "surplus motor replacement",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  openGraph: {
    title: "Rewind vs Surplus Motor | Which Is Cheaper? | IQMotorBase",
    description:
      "Honest comparison: motor rewinding vs surplus replacement. Costs, risks, lead times, and warranty terms side by side.",
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rewind vs Surplus Motor | Which Is Cheaper? | IQMotorBase",
    description: "Cost and risk comparison for industrial motor rewinding vs surplus replacement.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "Is it cheaper to rewind an industrial motor or buy a surplus replacement?",
    a: "It depends on motor HP and age. For motors under 50 HP, surplus often wins on upfront cost. For motors above 100 HP, rewinding is almost always cheaper because surplus large-frame motors are scarce and expensive. The hidden costs of surplus, no warranty on condition, unknown run hours, compatibility risk, shift the calculation further toward rewinding in most industrial applications.",
  },
  {
    q: "What are the risks of buying a surplus motor?",
    a: "Surplus motors have unknown run hours, unknown maintenance history, and typically no warranty on internal condition. A surplus motor that fails within 6 months of installation leaves you with no recourse. Rewinding includes a documented test report and a 12-month warranty on the rewind work. You know exactly what you are getting.",
  },
  {
    q: "How long does motor rewinding take vs sourcing a surplus motor?",
    a: "Standard motor rewinding takes 5 to 10 business days. Emergency rewinding can be done in 24 to 72 hours. Sourcing a surplus motor in the correct frame, voltage, and HP can take 1 to 4 weeks depending on the size and how obscure the specification is. For large-frame motors above 200 HP, rewinding is almost always faster than finding a compatible surplus unit.",
  },
  {
    q: "When should I choose surplus over rewinding?",
    a: "Choose surplus when: the motor is small (under 25 HP) and a standard NEMA frame replacement is readily available at low cost; the motor has failed multiple times and rewinding will not fix the underlying application problem; or you need to upgrade to a higher efficiency class (NEMA Premium) and the old motor predates EISA 2007 efficiency standards.",
  },
  {
    q: "Does rewinding affect motor efficiency?",
    a: "Not if done correctly. The EASA/AEMT Rewind Study found that motors rewound to EASA AR100 standards show no measurable efficiency loss. The risk is improper burnout temperature, which damages the stator core laminations. EASA-accredited shops perform core loss testing before and after burnout to verify efficiency is preserved.",
  },
];

function PageJsonLd() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const url = `${site}${path}`;
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rewind vs Surplus Motor | Which Is Cheaper?",
    url,
    description:
      "A direct cost and risk comparison between motor rewinding and surplus motor replacement for industrial applications.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Rewind vs Surplus", item: url },
      ],
    },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
      <script
        id="schema-webpage-rewind-vs-surplus"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <script
        id="schema-faq-rewind-vs-surplus"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

export default function RewindVsSurplusMotorReplacementPage() {
  return (
    <>
      <PageJsonLd />
      <BlogPageLayout
        title="Rewind vs surplus motor | which is actually cheaper?"
        description="A straight comparison for industrial buyers deciding between a motor rewind and a surplus replacement. Costs, risks, lead times, and warranty terms, side by side."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarUnwrapped
        stickySidebar
        sidebarCta={
          <RepairRequestForm
            mode="city"
            formHeading="Get a rewind quote, compare it to surplus pricing"
            layout="sidebar"
            className="mx-auto w-full max-w-none"
          />
        }
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section aria-labelledby="comparison-heading">
            <h2 id="comparison-heading" className="text-2xl font-bold text-title sm:text-3xl mt-2">
              Direct comparison
            </h2>
            <div className="mt-6 not-prose grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-success/40 bg-success/10 p-5">
                <h3 className="text-base font-bold text-title">Motor rewinding</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Upfront cost</dt>
                    <dd className="mt-0.5 text-secondary">
                      $400 to $9,000 depending on HP and motor type. Large-frame motors above 200 HP quoted individually.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Lead time</dt>
                    <dd className="mt-0.5 text-secondary">
                      5 to 10 business days standard. 24 to 72 hours emergency. Predictable, doesn&apos;t depend on parts
                      availability.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Warranty</dt>
                    <dd className="mt-0.5 text-secondary">
                      12 months on parts and labor, standard. You know exactly what was done and how it was tested.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Condition</dt>
                    <dd className="mt-0.5 text-secondary">
                      Known. Documented test protocol: insulation resistance, winding resistance, hi-pot, no-load run.
                      You get the test report.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Best for</dt>
                    <dd className="mt-0.5 text-secondary">
                      Motors above 50 HP, specialty frames, motors with known good operating history, first failure.
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5">
                <h3 className="text-base font-bold text-title">Surplus replacement</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Upfront cost</dt>
                    <dd className="mt-0.5 text-secondary">
                      Varies wildly. Small standard motors can be $200 to $800. Large or specialty motors are scarce , 
                      $5,000 to $30,000+ for 200+ HP units.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Lead time</dt>
                    <dd className="mt-0.5 text-secondary">
                      1 to 4 weeks depending on frame size and specification. Large or specialty motors can take months.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Warranty</dt>
                    <dd className="mt-0.5 text-secondary">
                      Usually 30 to 90 days on electrical function, not on internal condition or run hours.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Condition</dt>
                    <dd className="mt-0.5 text-secondary">
                      Unknown. Run hours, maintenance history, insulation condition, and bearing wear are often
                      undocumented.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Best for</dt>
                    <dd className="mt-0.5 text-secondary">
                      Motors under 25 HP with standard NEMA frames, second or third failures suggesting an application
                      problem, or efficiency upgrade goals.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section aria-labelledby="cost-heading">
            <h2 id="cost-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Cost comparison by motor HP
            </h2>
            <p className="mt-4 text-secondary">
              Ballpark ranges for US shops at standard (non-emergency) turnaround. Surplus prices are dealer averages , 
              actual prices vary significantly by availability.
            </p>
            <div className="mt-6 not-prose overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary text-white">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Motor HP
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Rewind cost
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Surplus cost
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Verdict
                    </th>
                  </tr>
                </thead>
                <tbody className="text-secondary">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">1 to 10 HP</td>
                    <td className="px-4 py-3">$400 to $900</td>
                    <td className="px-4 py-3">$150 to $400</td>
                    <td className="px-4 py-3">Surplus often wins on cost, if standard frame available</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-3 font-medium text-title">10 to 50 HP</td>
                    <td className="px-4 py-3">$1,200 to $3,500</td>
                    <td className="px-4 py-3">$500 to $2,000</td>
                    <td className="px-4 py-3">Comparable, rewind wins on compatibility and warranty</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">50 to 100 HP</td>
                    <td className="px-4 py-3">$2,500 to $5,000</td>
                    <td className="px-4 py-3">$2,000 to $6,000</td>
                    <td className="px-4 py-3">Rewind usually cheaper and faster</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-3 font-medium text-title">100 to 200 HP</td>
                    <td className="px-4 py-3">$4,000 to $8,000</td>
                    <td className="px-4 py-3">$5,000 to $15,000</td>
                    <td className="px-4 py-3">Rewind clearly cheaper</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-title">200+ HP</td>
                    <td className="px-4 py-3">$7,000 to $25,000+</td>
                    <td className="px-4 py-3">Scarce, $15,000 to $50,000+</td>
                    <td className="px-4 py-3">Rewind almost always the right choice</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-secondary">
              Sources: EASA member shop rate data, surplus motor dealer market prices (2024 to 2025). Get a real quote for
              your specific motor below.
            </p>
          </section>

          <section aria-labelledby="hidden-heading">
            <h2 id="hidden-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              The hidden costs of surplus motors most buyers miss
            </h2>
            <p className="mt-4 text-secondary">
              The sticker price comparison almost always favors surplus for smaller motors. But three hidden costs shift
              the calculation:
            </p>
            <dl className="mt-6 not-prose space-y-4 max-w-[44rem]">
              {[
                {
                  t: "Unknown condition risk",
                  d: "A surplus motor that fails within 90 days leaves you with a warranty dispute and downtime twice. Factor a realistic 15 to 25% probability of early failure on undocumented surplus, that cost often exceeds the price difference.",
                },
                {
                  t: "Sourcing and logistics time",
                  d: "Finding the correct frame, HP, voltage, and enclosure often takes longer than a rewind, especially above 100 HP. Emergency downtime during sourcing can dwarf either option’s price.",
                },
                {
                  t: "Energy efficiency over time",
                  d: "A surplus motor predating EISA 2007 may run at 88 to 91% efficiency vs 93 to 96% for a rewound motor held to EASA AR100. For a 50 HP motor at 6,000 hours/year and $0.12/kWh, a 4% gap is roughly $1,200/year, $6,000 over five years.",
                },
              ].map((item) => (
                <div key={item.t} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <dt className="font-bold text-title">{item.t}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-secondary">{item.d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="surplus-right-heading">
            <h2 id="surplus-right-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              When surplus is genuinely the right choice
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-6 text-secondary">
              <li>
                <strong className="text-title">Small motor, standard frame, readily available.</strong> A 5 HP NEMA
                184T TEFC motor is a commodity, off-the-shelf at $250 often beats a $600 rewind.
              </li>
              <li>
                <strong className="text-title">Repeated failure on the same motor.</strong> If it failed twice the same
                way, rewind may treat the symptom. Replacement better matched to the application may be the fix.
              </li>
              <li>
                <strong className="text-title">Efficiency upgrade goal.</strong> Old motors missing NEMA Premium that
                run 4,000+ hours/year may pay back with a new Premium motor in 2 to 3 years, new, not surplus.
              </li>
              <li>
                <strong className="text-title">End of design life.</strong> A motor rewound twice is near practical end
                of life; a third rewind works but laminations and mechanicals are worn.
              </li>
            </ul>
          </section>

          <section className="mt-10 not-prose" aria-labelledby="quote-heading">
            <h2 id="quote-heading" className="text-2xl font-bold text-title sm:text-3xl">
              Get a rewind quote for your motor
            </h2>
            <p className="mt-3 text-secondary">
              Submit your motor details, matched to certified repair shops in your area. Compare the quote to surplus
              pricing before you decide.
            </p>
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.06] p-4 sm:p-5 md:hidden">
              <RepairRequestForm
                mode="city"
                formHeading="Get a rewind quote, compare it to surplus pricing"
                className="mx-auto w-full max-w-none border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          </section>

          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {faqs.map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold text-title">{item.q}</dt>
                  <dd className="mt-2 text-secondary leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Related guides
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-secondary">
              <li>
                <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
                  Motor repair and rewinding cost guide, full ranges by HP
                </Link>
              </li>
              <li>
                <Link
                  href="/when-to-repair-or-replace-electric-motor"
                  className="font-medium text-primary hover:underline"
                >
                  When to repair vs replace an electric motor, full framework
                </Link>
              </li>
              <li>
                <Link href="/electric-motor-repair-near-me" className="font-medium text-primary hover:underline">
                  Find motor repair shops near me
                </Link>
              </li>
              <li>
                <Link
                  href="/how-to-choose-electric-motor-repair-shop"
                  className="font-medium text-primary hover:underline"
                >
                  How to evaluate a motor repair shop before you ship
                </Link>
              </li>
              <li>
                <Link
                  href="/electric-motor-repair-shops-listings"
                  className="font-medium text-primary hover:underline"
                >
                  Browse all certified repair centers
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
