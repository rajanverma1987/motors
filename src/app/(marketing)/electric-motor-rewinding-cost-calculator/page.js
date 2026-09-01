import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import MotorRewindCostCalculator from "@/components/marketing/motor-rewind-cost-calculator";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/electric-motor-rewinding-cost-calculator";
const dateModified = "2026-07-04";

export const metadata = {
  title: {
    absolute: "Electric Motor Rewinding Cost Calculator | Free US Ballpark (2026)",
  },
  description:
    "Free electric motor rewinding cost calculator. Enter HP, phase, and optional nameplate details for an instant US ballpark, see how each field affects your estimate.",
  keywords: [
    "electric motor rewinding cost calculator",
    "motor rewinding cost calculator",
    "motor rewind cost calculator",
    "electric motor repair cost calculator",
    "AC motor rewind price calculator",
    "motor rewind ballpark calculator",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  openGraph: {
    title: "Electric Motor Rewinding Cost Calculator | Free US Ballpark | IQMotorBase.com",
    description:
      "Instant US ballpark for electric motor rewinding cost. Enter HP, phase, and RPM, your estimate updates as you adjust the fields.",
    url: path,
    type: "website",
    siteName: "IQMotorBase.com",
    locale: "en_US",
    modifiedTime: dateModified,
  },
  twitter: {
    card: "summary_large_image",
    title: "Electric Motor Rewinding Cost Calculator (Free US Ballpark)",
    description: "Enter motor HP and specs for an instant rewinding cost range.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqItems = [
  {
    question: "How do I use the electric motor rewinding cost calculator?",
    answer:
      "Select motor horsepower and phase. Optionally set RPM or open Advanced details for voltage, stator slots, coil type, and wire size. The ballpark range updates as you change fields. Download the free PDF for a breakdown, or use Upload nameplate if you do not know all specs yet.",
  },
  {
    question: "What does each field in the calculator do?",
    answer:
      "Motor HP and phase drive the base labor and copper scaling. RPM adjusts winding complexity (leave blank for a typical 1800 RPM assumption). Advanced fields, voltage, slots, coil type, AWG, and optional copper weight, refine the material portion when you have nameplate or shop data.",
  },
  {
    question: "Is this calculator free to use?",
    answer:
      "Yes. The ballpark range, on-screen recommendation, and PDF download are free. The result is planning guidance only, not a binding shop quote.",
  },
  {
    question: "What should I do after I get a ballpark from the calculator?",
    answer:
      "Use the PDF if you need to share numbers internally, or Upload nameplate to request shop follow-up. For pricing tables, cost drivers, and longer FAQs, see the IQMotorBase.com motor rewinding cost guide, not this tool page.",
  },
];

function FaqJsonLd() {
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
      id="schema-faq-rewind-calculator"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function BreadcrumbJsonLd({ pageUrl, site }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      { "@type": "ListItem", position: 2, name: "Electric motor repair", item: `${site}/electric-motor-repair` },
      { "@type": "ListItem", position: 3, name: "Rewinding cost calculator", item: pageUrl },
    ],
  };
  return (
    <script
      id="schema-breadcrumb-rewind-calculator"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function WebPageJsonLd({ pageUrl, site }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: "Electric motor rewinding cost calculator (US ballpark)",
    description:
      "Free US ballpark calculator for electric motor rewinding cost, how to enter HP, phase, RPM, and optional winding details.",
    dateModified,
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
    about: { "@type": "Thing", name: "Electric motor rewinding cost calculator" },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#calculator-how-to", "#motor-rewind-cost-calculator"],
    },
  };
  return (
    <script
      id="schema-webpage-rewind-calculator"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function CalculatorJsonLd({ pageUrl }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Electric motor rewinding cost calculator",
    description:
      "Free US ballpark calculator for electric motor rewinding cost by horsepower, phase, RPM, and optional winding details.",
    url: `${pageUrl}#motor-rewind-cost-calculator`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isPartOf: { "@type": "WebPage", "@id": `${pageUrl}#webpage` },
  };
  return (
    <script
      id="schema-calculator-rewind"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function HowToJsonLd({ pageUrl }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use the electric motor rewinding cost calculator",
    description: "Step-by-step instructions for the IQMotorBase.com rewinding cost calculator.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Enter motor horsepower and phase",
        text: "Choose nameplate HP from the dropdown and select single-phase or three-phase.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Set RPM (optional)",
        text: "Pick nameplate RPM or leave blank to assume a typical 1800 RPM four-pole motor.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Refine with Advanced details (optional)",
        text: "Expand Advanced details for voltage, stator slots, coil type, magnet wire AWG, or known copper weight. Use example presets to fill common combinations.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Read the ballpark and download or share",
        text: "Review the low to high range and on-screen notes. Download the free PDF or use Upload nameplate when specs are incomplete.",
      },
    ],
    mainEntityOfPage: { "@type": "WebPage", "@id": `${pageUrl}#webpage` },
  };
  return (
    <script
      id="schema-howto-rewind-calculator"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function ElectricMotorRewindingCostCalculatorPage() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${path}`;

  return (
    <>
      <FaqJsonLd />
      <BreadcrumbJsonLd pageUrl={pageUrl} site={site} />
      <WebPageJsonLd pageUrl={pageUrl} site={site} />
      <CalculatorJsonLd pageUrl={pageUrl} />
      <HowToJsonLd pageUrl={pageUrl} />

      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <nav className="text-sm text-secondary" aria-label="Breadcrumb">
            <Link href="/electric-motor-repair" className="text-primary hover:underline">
              Electric motor repair
            </Link>
            <span className="mx-2 text-secondary/60">/</span>
            <span className="text-title">Rewinding cost calculator</span>
          </nav>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Electric motor rewinding cost calculator
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-secondary">
            Enter your motor specs below for an instant US ballpark. This page is the tool itself, pricing tables, cost
            drivers, and shop-selection guides live on our{" "}
            <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
              motor rewinding cost guide
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[67.2rem] px-4 py-10 sm:px-6 sm:py-12">
        <section id="motor-rewind-cost-calculator" aria-labelledby="calc-tool-heading">
          <p className="not-prose text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
            Interactive tool
          </p>
          <h2 id="calc-tool-heading" className="mt-2 text-xl font-bold tracking-tight text-title sm:text-2xl">
            Get your ballpark rewinding cost
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">
            Adjust the fields below, your estimate updates automatically. Not a shop quote; inspection may change scope
            and price.
          </p>
          <div className="not-prose mt-6">
            <MotorRewindCostCalculator fullHeadingAsH2 compact calculatorSourcePage={path} />
          </div>
        </section>

        <article className="prose prose-neutral dark:prose-invert mt-14 max-w-none">
          <section id="calculator-how-to">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">How to use this calculator</h2>
            <p className="text-secondary">
              The estimate recalculates as you change inputs. You do not need every nameplate field to start, add detail
              when you have it.
            </p>

            <h3 className="mt-8 text-lg font-semibold text-title">Step 1| Motor HP and phase</h3>
            <p className="text-secondary">
              Choose <strong className="text-title">Motor HP</strong> from the dropdown to match your nameplate rating.
              Select <strong className="text-title">Phase</strong> (single-phase or three-phase). These two fields drive
              most of the labor and copper scaling in the model.
            </p>

            <h3 className="mt-8 text-lg font-semibold text-title">Step 2, RPM (optional)</h3>
            <p className="text-secondary">
              If your nameplate lists speed, pick the matching <strong className="text-title">RPM</strong> (900, 1200,
              1800, 3600, etc.). If you leave RPM blank, the calculator assumes a typical{" "}
              <strong className="text-title">1800 RPM</strong> four-pole motor.
            </p>

            <h3 className="mt-8 text-lg font-semibold text-title">Step 3, Advanced details (optional)</h3>
            <p className="text-secondary">
              Expand <strong className="text-title">Advanced details</strong> when you have more nameplate or shop
              data:
            </p>
            <ul className="mt-3 space-y-2 text-secondary">
              <li>
                <strong className="text-title">Example presets</strong>, fills HP, RPM, slots, and wire for common
                motor sizes (e.g. 3 HP · 1800 RPM · 36 slot).
              </li>
              <li>
                <strong className="text-title">Voltage</strong>, nameplate voltage class (115 V through medium voltage).
              </li>
              <li>
                <strong className="text-title">Stator slots</strong>, slot count from the nameplate or winding data.
              </li>
              <li>
                <strong className="text-title">Coil type</strong>, lap, wave, or concentric when known.
              </li>
              <li>
                <strong className="text-title">Magnet wire (AWG)</strong>, wire size when you have it from a prior
                rewind or takeoff.
              </li>
              <li>
                <strong className="text-title">Copper weight</strong>, only if a shop or teardown already gave you
                approximate kg; otherwise leave blank and the model estimates from size.
              </li>
            </ul>

            <h3 className="mt-8 text-lg font-semibold text-title">Step 4, Read your ballpark</h3>
            <p className="text-secondary">
              The <strong className="text-title">Ballpark estimate (US)</strong> box shows a low to high range that updates
              live. Below it you may see short notes, for example fractional-HP minimum fees, industrial custom-pricing
              reminders, or a rewind-vs-new-motor hint. Expand{" "}
              <strong className="text-title">How this estimate is calculated</strong> inside the tool for methodology
              and data sources.
            </p>

            <h3 className="mt-8 text-lg font-semibold text-title">Step 5, Download, upload, or move on</h3>
            <ul className="mt-3 space-y-2 text-secondary">
              <li>
                <strong className="text-title">Download Detailed Estimate</strong>, free PDF with your inputs,
                ballpark range, and breakdown for internal sharing.
              </li>
              <li>
                <strong className="text-title">Upload nameplate for an estimate</strong>, use when you do not know
                winding specs; we route photos so shops can advise or quote.
              </li>
              <li>
                <strong className="text-title">Need pricing context?</strong>, HP tables, cost drivers, and FAQs are
                on the{" "}
                <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
                  motor rewinding cost guide
                </Link>
                , not duplicated here.
              </li>
            </ul>
          </section>

          <section id="calculator-faq" className="mt-12">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">Calculator FAQ</h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.question}>
                  <dt className="text-base font-semibold text-title">{item.question}</dt>
                  <dd className="mt-2 text-secondary">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </article>
      </div>
    </>
  );
}
