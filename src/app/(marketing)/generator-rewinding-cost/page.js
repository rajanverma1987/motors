import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import RepairRequestForm from "@/components/marketing/repair-request-form";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/generator-rewinding-cost";

export const metadata = {
  title: "Generator Rewinding Cost: What It Costs in 2026 | IQMotorBase",
  description:
    "Generator rewinding typically costs $1,500 to $15,000 depending on KW rating, winding type, and urgency. Get matched to certified generator rewind shops in your area.",
  keywords: [
    "generator rewinding cost",
    "how much does it cost to rewind a generator",
    "generator rewind price",
    "alternator rewind cost",
    "generator stator rewind",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  openGraph: {
    title: "Generator Rewinding Cost | 2026 Price Guide | IQMotorBase",
    description:
      "How much does it cost to rewind a generator? $1,500 to $15,000 depending on KW and winding type. Find a certified shop near you.",
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Generator Rewinding Cost: What It Costs in 2026 | IQMotorBase",
    description: "Cost guide for generator rewinding by KW rating, winding type, and urgency.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "How much does it cost to rewind a generator?",
    a: "Generator rewinding typically costs $1,500 to $15,000 depending on the generator's KW rating, winding configuration (stator only, rotor/armature, exciter), and whether emergency turnaround is needed. Small portable generators (5 to 25 KW) run $1,500 to $4,000. Medium commercial generators (25 to 150 KW) run $3,000 to $8,000. Large industrial generators above 150 KW are quoted individually and can exceed $15,000 for large alternators.",
  },
  {
    q: "What parts of a generator can be rewound?",
    a: "The stator (main winding), rotor or armature (on DC generators and some AC brushed types), and exciter winding can all be rewound. Most generator failures involve the stator winding due to insulation breakdown from heat, moisture, or voltage surges. Exciter failures are less common but require specialist capability.",
  },
  {
    q: "Is it worth rewinding a generator or should I replace it?",
    a: "For generators above 25 KW, rewinding is almost always worth it, replacement costs and lead times for industrial generators far exceed the rewind cost. For small portable generators under 10 KW, replacement is often cheaper. For standby generators in critical applications, rewinding with a full test protocol provides a documented known condition that replacement with a used unit cannot.",
  },
  {
    q: "How long does generator rewinding take?",
    a: "Standard generator rewinds take 7 to 14 business days depending on size and parts availability. Large alternator rewinds requiring custom coils take 3 to 6 weeks. Emergency rewinds are available at many shops for smaller generators, turnaround of 3 to 5 days at a premium rate.",
  },
  {
    q: "What testing is done after generator rewinding?",
    a: "A proper generator rewind includes insulation resistance (megohm) testing, winding resistance measurement, high-potential (hi-pot) testing per IEEE standards, and a no-load run test at rated voltage and frequency. Output voltage regulation and waveform quality are verified before return. Request a written test report, professional shops provide this as standard.",
  },
];

function PageJsonLd() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const url = `${site}${path}`;
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Generator Rewinding Cost",
    url,
    description: "Cost guide for generator rewinding by KW rating, winding type, and urgency.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        {
          "@type": "ListItem",
          position: 2,
          name: "Motor repair costs",
          item: `${site}/cost-of-motor-repair-and-rewinding`,
        },
        { "@type": "ListItem", position: 3, name: "Generator Rewinding Cost", item: url },
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
        id="schema-webpage-generator-rewinding-cost"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <script
        id="schema-faq-generator-rewinding-cost"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

export default function GeneratorRewindingCostPage() {
  return (
    <>
      <PageJsonLd />
      <BlogPageLayout
        title="Generator rewinding cost"
        description="What generator rewinding costs in 2026, by KW rating, winding type, and urgency. Get a quote from a certified shop in your area."
        breadcrumbLink={{ href: "/cost-of-motor-repair-and-rewinding", label: "Motor repair costs" }}
        canonicalPath={path}
        sidebarUnwrapped
        stickySidebar
        sidebarCta={
          <RepairRequestForm
            mode="city"
            defaultMotorType="Generator"
            formHeading="Request a generator rewind quote"
            layout="sidebar"
            className="mx-auto w-full max-w-none"
          />
        }
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section aria-labelledby="cost-heading">
            <h2 id="cost-heading" className="text-2xl font-bold text-title sm:text-3xl mt-2">
              Cost ranges by generator size
            </h2>
            <div className="mt-6 not-prose overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary text-white">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Generator size
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Stator rewind
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Full rewind (stator + exciter)
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Emergency surcharge
                    </th>
                  </tr>
                </thead>
                <tbody className="text-secondary">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">5 to 25 KW portable / small</td>
                    <td className="px-4 py-3">$1,500 to $2,800</td>
                    <td className="px-4 py-3">$2,500 to $4,000</td>
                    <td className="px-4 py-3">+25 to 40%</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-3 font-medium text-title">25 to 75 KW commercial</td>
                    <td className="px-4 py-3">$2,500 to $5,000</td>
                    <td className="px-4 py-3">$4,000 to $7,000</td>
                    <td className="px-4 py-3">+25 to 40%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-title">75 to 150 KW commercial</td>
                    <td className="px-4 py-3">$4,500 to $7,500</td>
                    <td className="px-4 py-3">$6,000 to $10,000</td>
                    <td className="px-4 py-3">+25 to 50%</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-3 font-medium text-title">150 to 500 KW industrial</td>
                    <td className="px-4 py-3">$7,000 to $15,000</td>
                    <td className="px-4 py-3">Quote individually</td>
                    <td className="px-4 py-3">+25 to 50%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-title">500 KW+ large alternator</td>
                    <td className="px-4 py-3">Quote individually</td>
                    <td className="px-4 py-3">Quote individually</td>
                    <td className="px-4 py-3">Negotiated</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-secondary">
              Ranges are for US shops at standard turnaround. AC synchronous generator stators. DC generator armature
              rewinding priced separately, submit your details for a quote.
            </p>
          </section>

          <section aria-labelledby="factors-heading">
            <h2 id="factors-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              What affects generator rewinding cost
            </h2>
            <dl className="mt-6 not-prose space-y-4 max-w-[44rem]">
              {[
                {
                  t: "Winding scope",
                  d: "Stator-only rewinds are the most common and least expensive. If the exciter or rotor also needs rewinding, add 40 to 80% to the stator cost.",
                },
                {
                  t: "Voltage class",
                  d: "Generators above 600V require form-wound coils, specialized insulation, and elevated hi-pot testing, significantly more than random-wound low-voltage stators.",
                },
                {
                  t: "Manufacturer and parts availability",
                  d: "Common brands (Kohler, Generac, Stamford, Leroy Somer, Marathon) have established rewind specs. Obscure brands may need reverse-engineering before work begins.",
                },
                {
                  t: "Urgency",
                  d: "Critical backup units (hospitals, data centers, utilities) often command a 25 to 50% premium for priority scheduling and overtime.",
                },
              ].map((item) => (
                <div key={item.t} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <dt className="font-bold text-title">{item.t}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-secondary">{item.d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="diff-heading">
            <h2 id="diff-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              How generator rewinding differs from motor rewinding
            </h2>
            <p className="mt-4 text-secondary">Not all motor repair shops do generator rewinding. The key differences:</p>
            <ul className="mt-4 list-disc space-y-3 pl-6 text-secondary">
              <li>
                <strong className="text-title">Output voltage testing.</strong> Generators must be tested at rated
                output voltage and frequency, often with a load bank, not just a no-load spin.
              </li>
              <li>
                <strong className="text-title">Exciter and AVR expertise.</strong> AC synchronous generators have an
                exciter and AVR. Missing related faults can cause early repeat failure.
              </li>
              <li>
                <strong className="text-title">Winding configuration.</strong> Generator stator coil pitch, slot fill,
                and leads differ from typical motor stators.
              </li>
            </ul>
            <p className="mt-4 text-secondary">
              When submitting your request, specify that your unit is a generator (not a motor) so we match you to shops
              with confirmed generator rewind capability.
            </p>
          </section>

          <section className="mt-10 not-prose" aria-labelledby="quote-gen-heading">
            <h2 id="quote-gen-heading" className="text-2xl font-bold text-title sm:text-3xl">
              Get a generator rewind quote
            </h2>
            <p className="mt-3 text-secondary">
              Submit KW rating, manufacturer, failure symptoms, and urgency, matched to shops with generator rewind
              capability in your area.
            </p>
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.06] p-4 sm:p-5 md:hidden">
              <RepairRequestForm
                mode="city"
                defaultMotorType="Generator"
                formHeading="Request a generator rewind quote"
                className="mx-auto w-full max-w-none border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          </section>

          <section aria-labelledby="gen-faq-heading">
            <h2 id="gen-faq-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
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

          <section aria-labelledby="related-gen-heading">
            <h2 id="related-gen-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Related guides
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-secondary">
              <li>
                <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
                  Motor repair and rewinding cost guide, full ranges
                </Link>
              </li>
              <li>
                <Link href="/emergency-motor-repair-what-to-do" className="font-medium text-primary hover:underline">
                  Emergency motor and generator repair, what to do now
                </Link>
              </li>
              <li>
                <Link href="/electric-motor-repair-near-me" className="font-medium text-primary hover:underline">
                  Find generator and motor repair shops near me
                </Link>
              </li>
              <li>
                <Link
                  href="/when-to-repair-or-replace-electric-motor"
                  className="font-medium text-primary hover:underline"
                >
                  Repair vs replace, decision framework
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
