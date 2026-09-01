import Link from "next/link";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getEmergencyRepairListings } from "@/lib/listings-public";
import { LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import RepairRequestForm from "@/components/marketing/repair-request-form";
import EmergencyShopsStrip from "./emergency-shops-strip";
import EmergencyFaqAccordion from "./emergency-faq-accordion";

const path = "/emergency-motor-repair-what-to-do";

export const metadata = marketingPageMetadata({
  path,
  title: "Emergency Motor Repair | 24/7 Rush Service | IQMotorBase",
  description:
    "Motor down? Submit an emergency repair request now, matched to 24/7 shops in your area. Find rush motor repair, rewinding, and field service. Get back online fast.",
  ogTitle: "Emergency Motor Repair | 24/7 Rush Service | IQMotorBase",
  ogDescription: "Motor down? Submit an emergency repair request now, matched to 24/7 shops in your area.",
  keywords: [
    "emergency motor repair",
    "24 7 motor repair",
    "rush motor rewind",
    "motor failure emergency",
    "emergency motor rewinding",
    "urgent motor repair",
  ],
});

const EMERGENCY_FAQS = [
  {
    question: "How fast can a motor be repaired on an emergency basis?",
    answer:
      "Most 24/7 shops can begin diagnostics the same day a motor arrives. Simple repairs (bearing replacement, minor electrical faults) can be completed in 24 to 48 hours. Full rewinds on smaller motors (under 50 HP) typically take 48 to 72 hours on emergency turnaround. Large frame or high-voltage motors take longer, ask the shop for a specific timeline when you submit the motor.",
  },
  {
    question: "How much does emergency motor repair cost compared to standard?",
    answer:
      "Emergency repair carries a premium of 25 to 50% above standard rates due to overtime labor, expedited parts sourcing, and priority scheduling. For a motor failure costing $5,000+ per hour in downtime, that premium is almost always worth it. Always get the emergency rate confirmed in writing before authorizing work.",
  },
  {
    question: "What information do I need for an emergency motor repair request?",
    answer:
      "HP, voltage, RPM, motor type (AC/DC/servo), and failure symptoms. A photo of the nameplate is ideal, if you can send it with your request, shops can pre-diagnose and have parts staged before the motor arrives. If the nameplate is missing or illegible, the shop will determine specs on arrival.",
  },
  {
    question: "Should I ship the motor or get field service for an emergency?",
    answer:
      "Shipping is faster for motors under 200 HP, most shops can start work within hours of receiving a shipped motor. For larger motors or motors that cannot be safely removed (integrated equipment, large horsepower, hazardous location), field service is the right call. Specify which you need in your request so the shop can respond with the right team.",
  },
  {
    question: "What if the shop cannot repair my motor fast enough?",
    answer:
      "Ask the shop about rental or loaner motors while yours is in repair. Many industrial shops maintain a stock of common frame sizes for loan or short-term rental. Also ask whether a rewind can be expedited with parallel operations, stripping, coil forming, and winding run simultaneously to compress the timeline.",
  },
  {
    question: "Are emergency motor repair shops available 24/7?",
    answer:
      "Many industrial motor repair shops listed on IQMotorBase offer 24/7 emergency intake and technician callout. Coverage varies by region, use the form on this page to submit your requirement and we will match you to shops in your area that have confirmed emergency capability.",
  },
];

const STEPS = [
  {
    title: "Make the motor safe first.",
    body:
      "Follow your lockout/tagout procedure before anyone approaches the motor. Do not attempt to restart a motor that has tripped, smoked, or made unusual noise, restarting a failed motor can cause winding damage that turns a $2,000 repair into a $12,000 rewind.",
  },
  {
    title: "Document the failure.",
    body:
      "Note exactly what happened: did it trip the overload, make grinding or humming noise, smell of burning, vibrate, or fail to start? Take a photo of the nameplate (HP, voltage, RPM, frame, enclosure) and any visible damage. Send these with your repair request, shops can pre-diagnose and stage parts before your motor arrives.",
  },
  {
    title: "Submit your request above.",
    body:
      "Include motor type, HP, failure symptoms, and whether you need pickup or can ship. We match your request to 24/7 shops serving your area. For emergency jobs, shops respond within the hour during business hours and most have after-hours contact for true production emergencies.",
  },
  {
    title: "Ask about parallel options.",
    body:
      "While the motor is in repair, ask the shop whether they have a loaner or rental motor in a compatible frame size. Many industrial shops maintain loaners for common NEMA frames. Even partial production restoration while your motor is rewound can cut downtime cost significantly.",
  },
  {
    title: "Confirm timeline and rate in writing.",
    body:
      "Before the motor leaves your facility, get a written commitment on: estimated return date, emergency rate (expect 25 to 50% above standard), what testing will be performed, and warranty coverage on the emergency repair.",
  },
];

const RELATED_LINKS = [
  {
    href: "/electric-motor-repair-near-me",
    label: "Find motor repair shops near me",
    hint: "browse by state, filter by emergency capability",
  },
  {
    href: "/how-to-choose-electric-motor-repair-shop",
    label: "How to evaluate a motor repair shop",
    hint: "certifications, testing standards, warranty terms",
  },
  {
    href: "/when-to-repair-or-replace-electric-motor",
    label: "Repair vs. replace: the decision framework",
    hint: "when emergency repair makes sense vs. replacement",
  },
  {
    href: "/cost-of-motor-repair-and-rewinding",
    label: "Motor repair and rewinding cost guide",
    hint: "US ballpark ranges by HP and repair type",
  },
  {
    href: "/electric-motor-repair-shops-listings",
    label: "Full directory of repair centers",
    hint: "search all locations",
  },
];

export default async function EmergencyMotorRepairWhatToDoPage() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${path}`;
  const shops = await getEmergencyRepairListings();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: EMERGENCY_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Emergency Motor Repair | 24/7 Rush Service",
    url: pageUrl,
    description:
      "Find 24/7 emergency motor repair shops near you. Submit a repair request, matched to shops with confirmed emergency capability in your area.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Emergency Motor Repair", item: pageUrl },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex items-center gap-2 bg-danger px-4 py-2.5 text-sm font-semibold tracking-wide text-white">
        <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-white" aria-hidden />
        Emergency motor repair, 24/7 shops available now
      </div>

      <div className={`${LISTINGS_PAGE_CONTAINER} py-8 sm:py-10`}>
        <nav aria-label="Breadcrumb" className="text-sm text-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="text-primary hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="text-title">
              Emergency motor repair
            </li>
          </ol>
        </nav>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-title sm:text-4xl">Emergency motor repair</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-secondary sm:text-lg">
          Motor down and production stopped? Submit your repair request below, matched to 24/7 shops in your area
          within minutes. Or call a shop directly from the directory.
        </p>

        <div className="mt-8 max-w-[53rem]">
          <RepairRequestForm mode="city" defaultUrgency="emergency" className="mx-auto w-full max-w-none" />
        </div>

        <section aria-labelledby="steps-heading" className="mt-12 max-w-3xl">
          <h2 id="steps-heading" className="text-xl font-bold text-title sm:text-2xl">
            What to do right now, 5 steps
          </h2>
          <ol className="mt-6 list-decimal space-y-5 pl-5 text-sm leading-relaxed text-text sm:text-[0.9375rem]">
            {STEPS.map((step) => (
              <li key={step.title}>
                <strong className="text-title">{step.title}</strong> {step.body}
              </li>
            ))}
          </ol>
        </section>

        <EmergencyShopsStrip shops={shops} />

        <section aria-labelledby="cost-heading" className="mt-12 max-w-3xl">
          <h2 id="cost-heading" className="text-xl font-bold text-title sm:text-2xl">
            Emergency repair cost, what to expect
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary">
            Emergency motor repair carries a 25 to 50% premium above standard rates due to overtime labor, expedited parts
            sourcing, and priority queue placement. For production lines where downtime costs $1,000 to $10,000 per hour,
            this premium is almost always justified.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            Benchmark ranges at emergency rates: bearing replacement $300 to $1,800 depending on frame size; full rewind on
            a 10 to 50 HP motor $1,800 to $5,000; large frame rewinds (above 200 HP) are quoted individually. Always confirm
            the emergency rate before authorizing transport.
          </p>
          <p className="mt-3 text-sm text-secondary">
            For full cost ranges by HP, repair type, and region →{" "}
            <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
              Electric motor repair and rewinding cost guide
            </Link>
          </p>
        </section>

        <EmergencyFaqAccordion items={EMERGENCY_FAQS} />

        <section aria-labelledby="related-heading" className="mt-12 max-w-3xl">
          <h2 id="related-heading" className="text-xl font-bold text-title sm:text-2xl">
            Related guides
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {RELATED_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-medium text-primary hover:underline">
                  {item.label}
                </Link>
                <span className="text-secondary">, {item.hint}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
