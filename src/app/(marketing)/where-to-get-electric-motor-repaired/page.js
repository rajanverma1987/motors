import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import RepairRequestForm from "@/components/marketing/repair-request-form";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/where-to-get-electric-motor-repaired";

export const metadata = {
  title: "Where to Get Industrial Motor Repair Near Your Facility | 3PhaseFlow",
  description:
    "Submit plant or facility motor details (5+ HP) and get matched to industrial repair shops in your area. AC, DC, servo, high-voltage, and emergency industrial motor repair. Not for residential, pool, or spa motors.",
  keywords: [
    "where to get industrial motor repaired",
    "industrial motor repair near facility",
    "find industrial motor repair shop",
    "plant motor repair shop near me",
    "industrial motor repair near me",
  ],
  authors: [{ name: "3PhaseFlow.com" }],
  openGraph: {
    title: "Where to Get Industrial Motor Repair | 3PhaseFlow",
    description:
      "Find industrial motor repair shops near your facility. Submit plant motor details for 5+ HP work. Same-day shop response when matched.",
    url: path,
    type: "article",
    siteName: "3PhaseFlow.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Where to Get Industrial Motor Repair | 3PhaseFlow",
    description: "Submit plant motor details (5+ HP), matched to industrial shops near your facility.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    q: "Where can I get an industrial electric motor repaired?",
    a: "Submit a repair request on 3PhaseFlow for plant or facility motors typically 5 HP and above and we'll match you to industrial repair shops in your area. You can also browse the directory by state. Residential, pool, and spa motors are not matched through this network.",
  },
  {
    q: "How do I know which industrial motor repair shop to choose?",
    a: "Look for EASA (Electrical Apparatus Service Association) accreditation, it means the shop follows EASA AR100 repair standards. Ask whether they perform all rewind work in-house or subcontract it. Ask for a written test report with the repaired motor. Shops listed on 3PhaseFlow have verified capabilities and service areas.",
  },
  {
    q: "How quickly can an industrial electric motor be repaired?",
    a: "Standard turnaround is 5 to 10 business days for most motors under 200 HP. Emergency repair shops can complete simple repairs in 24 to 48 hours and full rewinds in 48 to 72 hours at a premium rate. If your motor is production-critical, indicate emergency in your repair request to get matched to shops with emergency capacity.",
  },
  {
    q: "What types of industrial electric motors can be repaired?",
    a: "Three-phase AC induction motors, DC motors, servo motors, high-voltage motors, and generators used in plants and commercial facilities. This network focuses on industrial and commercial work, not residential or pool/spa pumps. Confirm encoder and voltage capability with the shop before shipping.",
  },
];

function PageJsonLd() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const url = `${site}${path}`;
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Where to Get Industrial Motor Repair",
    url,
    description:
      "Find industrial electric motor repair shops near your facility for plant motors 5 HP and above.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        {
          "@type": "ListItem",
          position: 2,
          name: "Industrial motor repair near me",
          item: `${site}/electric-motor-repair-near-me`,
        },
        { "@type": "ListItem", position: 3, name: "Where to get industrial motor repaired", item: url },
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
        id="schema-webpage-where-to-get-motor-repaired"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <script
        id="schema-faq-where-to-get-motor-repaired"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

export default function WhereToGetElectricMotorRepairedPage() {
  return (
    <>
      <PageJsonLd />
      <BlogPageLayout
        title="Where to get your electric motor repaired"
        description="Submit your motor details below, matched to certified repair shops in your area. Most shops respond within a few hours."
        breadcrumbLink={{ href: "/electric-motor-repair-near-me", label: "Find motor repair" }}
        canonicalPath={path}
        sidebarUnwrapped
        stickySidebar
        sidebarCta={
          <RepairRequestForm
            mode="city"
            formHeading="Find a repair shop, submit your motor details"
            layout="sidebar"
            className="mx-auto w-full max-w-none"
          />
        }
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {/* Form first, urgent intent */}
          <section className="not-prose" aria-labelledby="wtr-form-heading">
            <h2 id="wtr-form-heading" className="sr-only">
              Submit a repair request
            </h2>
            <div className="rounded-xl border-2 border-primary/25 bg-primary/[0.08] p-4 sm:p-5 shadow-sm">
              <RepairRequestForm
                mode="city"
                formHeading="Find a repair shop, submit your motor details"
                className="mx-auto w-full max-w-none border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          </section>

          <section aria-labelledby="options-heading">
            <h2 id="options-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Your options for getting a motor repaired
            </h2>
            <dl className="mt-6 not-prose space-y-4 max-w-[44rem]">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <dt className="font-bold text-title">Submit a repair request (fastest)</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-secondary">
                  Use the form above. Enter motor type, HP, and failure description. We match your request to certified
                  shops serving your area, usually within a few hours. For emergency repairs, select emergency priority
                  so shops with 24/7 capacity are prioritized.
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <dt className="font-bold text-title">Browse the directory by state</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-secondary">
                  The{" "}
                  <Link href="/electric-motor-repair-shops-listings" className="font-medium text-primary hover:underline">
                    3PhaseFlow directory
                  </Link>{" "}
                  lists certified repair centers across the USA. Best for non-urgent repairs where you want to compare a
                  few shops first.
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <dt className="font-bold text-title">Search for emergency repair near you</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-secondary">
                  If production is stopped, go to the{" "}
                  <Link href="/emergency-motor-repair-what-to-do" className="font-medium text-primary hover:underline">
                    emergency motor repair page
                  </Link>
                  . The form there is pre-set for emergency priority.
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="what-heading">
            <h2 id="what-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              What to have ready before you contact a shop
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-6 text-secondary">
              <li>
                <strong className="text-title">Motor nameplate data:</strong> HP, voltage, RPM, frame, enclosure,
                insulation class. A photo of the nameplate is fastest.
              </li>
              <li>
                <strong className="text-title">Failure symptoms:</strong> Tripped overloads, noise, smoke, vibration, or
                failure to start?
              </li>
              <li>
                <strong className="text-title">Urgency:</strong> Is this production-critical? How many hours of downtime
                are acceptable?
              </li>
              <li>
                <strong className="text-title">Location logistics:</strong> Ship/drop-off, pickup, or field service?
              </li>
            </ul>
            <p className="mt-4 text-secondary">
              For a full pre-contact checklist →{" "}
              <Link href="/electric-motor-repair-near-me" className="font-medium text-primary hover:underline">
                Electric motor repair near me guide
              </Link>
            </p>
          </section>

          <section aria-labelledby="wtr-faq-heading">
            <h2 id="wtr-faq-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
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

          <section aria-labelledby="related-wtr-heading">
            <h2 id="related-wtr-heading" className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Related
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-secondary">
              <li>
                <Link href="/electric-motor-repair-near-me" className="font-medium text-primary hover:underline">
                  Find electric motor repair shops near me
                </Link>
              </li>
              <li>
                <Link href="/emergency-motor-repair-what-to-do" className="font-medium text-primary hover:underline">
                  Emergency motor repair, what to do right now
                </Link>
              </li>
              <li>
                <Link
                  href="/how-to-choose-electric-motor-repair-shop"
                  className="font-medium text-primary hover:underline"
                >
                  How to evaluate a motor repair shop
                </Link>
              </li>
              <li>
                <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
                  Motor repair cost guide
                </Link>
              </li>
              <li>
                <Link
                  href="/electric-motor-repair-shops-listings"
                  className="font-medium text-primary hover:underline"
                >
                  Browse all repair centers
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
