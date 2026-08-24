import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import IqwireStoreCta from "@/components/marketing/iqwirecalculator/store-cta";
import {
  CatalogPhoneMock,
  InputsPhoneMock,
  ResultsPhoneMock,
  SharePhoneMock,
} from "@/components/marketing/iqwirecalculator/phone-mocks";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  IQWIRECALCULATOR_FAQS,
  IQWIRECALCULATOR_META_DESCRIPTION,
  IQWIRECALCULATOR_MONTHLY_USD,
  IQWIRECALCULATOR_PAGE_TITLE,
  IQWIRECALCULATOR_PATH,
  IQWIRECALCULATOR_TRIAL_DAYS,
} from "@/lib/iqwirecalculator-marketing";

const path = IQWIRECALCULATOR_PATH;

export const metadata = {
  title: { absolute: IQWIRECALCULATOR_PAGE_TITLE },
  description: IQWIRECALCULATOR_META_DESCRIPTION,
  keywords: [
    "circular mils calculator",
    "wire size CM calculator",
    "magnet wire substitution calculator",
    "AWG to circular mils app",
    "parallel wire calculator electric motor",
    "motor rewind wire calculator app",
    "CM best match",
    "wire gauge substitution for motor rewind",
  ],
  openGraph: {
    title: IQWIRECALCULATOR_PAGE_TITLE,
    description: IQWIRECALCULATOR_META_DESCRIPTION,
    url: path,
    type: "website",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: IQWIRECALCULATOR_PAGE_TITLE,
    description: IQWIRECALCULATOR_META_DESCRIPTION,
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const steps = [
  {
    n: "1",
    title: "Enter your target CM",
    body: "Use original takeoff, or a new target after a voltage or connection change. Original wires-in-hand and size stay on the sheet as notes.",
  },
  {
    n: "2",
    title: "Pick your wire sizes",
    body: "Check the AWG you stock, or add custom and half sizes. The search only uses what you select—up to 10 sizes per run.",
  },
  {
    n: "3",
    title: "Get ranked results",
    body: "Mixes within ±10% of target, closest first. Green is about 2% or tighter. Yellow is still in the 10% band. Up to three gauges in one mix.",
  },
  {
    n: "4",
    title: "Print, email, or save it",
    body: "Put the mix on the traveler before winding starts. Name a save so second shift does not redo the search.",
  },
];

const scenarios = [
  {
    title: "Emergency stock-outs",
    body: "Original 19 is gone. Select 18 and 20, run Best Match, pick a mix whose total CM is close enough to wind today.",
  },
  {
    title: "Voltage or connection changes",
    body: "Turns and parallels shift the CM target. Same search, new number. You are not rebuilding a spreadsheet on the floor.",
  },
  {
    title: "Consistency across shifts",
    body: "Print or save the mix. The next winder does not reinvent it. Juniors see how strand count moves total CM.",
  },
  {
    title: "Fewer napkin errors",
    body: "A documented PDF beats a handwritten combo that nobody can read at varnish. Callbacks from a wrong copper area are expensive.",
  },
];

const included = [
  "Built-in copper AWG table, plus custom and half sizes (up to 100 extras)",
  "Search up to 10 selected sizes; up to 3 distinct sizes per mix",
  "Green (about 2%) and yellow (about 10%) match ranking",
  "Save named calculations and reopen them later",
  "Print a landscape PDF or email results from the phone",
  "Your stocked sizes only—no textbook AWG you cannot buy",
];

function JsonLd() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${path}`;
  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IQWireCalculator",
    url: pageUrl,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "iOS, Android",
    description: IQWIRECALCULATOR_META_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: IQWIRECALCULATOR_MONTHLY_USD.toFixed(2),
      priceCurrency: "USD",
      description: `${IQWIRECALCULATOR_TRIAL_DAYS}-day free trial, then $${IQWIRECALCULATOR_MONTHLY_USD.toFixed(2)} per month`,
    },
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: IQWIRECALCULATOR_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use IQWireCalculator CM Best Match",
    description: "Find a parallel magnet-wire mix close to a target circular mils value.",
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
    </>
  );
}

export default function IqwireCalculatorMarketingPage() {
  const price = IQWIRECALCULATOR_MONTHLY_USD.toFixed(2);

  return (
    <>
      <JsonLd />

      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto grid max-w-[86.4rem] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              IQWireCalculator · iOS &amp; Android
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Stop Guessing Wire Substitutions on the Floor
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-secondary sm:text-lg">
              IQWireCalculator’s CM Best Match finds parallel wire combinations within 10% of your target circular mils,
              ranked closest first—built for rewind shops, not electricians in general.
            </p>
            <div className="mt-6">
              <IqwireStoreCta />
            </div>
            <p className="mt-4">
              <a href="#how-it-works" className="text-sm font-medium text-primary hover:underline">
                See how it works
              </a>
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ResultsPhoneMock />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="problem-heading">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <h2 id="problem-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Why circular mils—and why a calculator
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-secondary">
            Total CM of a wound path is each wire size’s circular mils times how many strands you put in hand, added
            together. When the original size is out of stock, or a voltage change needs a new target, shops have always
            done that by hand or in an old spreadsheet. That is slow. A missed count means a bad wind or a callback.
            IQWireCalculator runs the mix search against sizes you actually stock so you leave the bench with a ranked
            list, not a guess.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby="how-heading">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            How CM Best Match works
          </h2>
          <p className="mt-3 max-w-2xl text-secondary">Four steps. Same math as the IQMotorBase shop tools.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.n} className="rounded-2xl border border-border bg-bg p-5">
                <span className="text-sm font-bold text-primary">{step.n}</span>
                <h3 className="mt-2 text-base font-semibold text-title">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="why-heading">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h2 id="why-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Where winders actually use it
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {scenarios.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-title">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby="included-heading">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <h2 id="included-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            What’s in the app
          </h2>
          <ul className="mt-6 space-y-3">
            {included.map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-relaxed text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-secondary">
            This is the standalone phone app. It does not sync a shop Shop Management System catalog. Shops on IQMotorBase keep CM Best
            Match in the{" "}
            <Link href="/dashboards?tab=calculators" className="font-medium text-primary hover:underline">
              dashboard calculators
            </Link>{" "}
            and the{" "}
            <Link href="/technician-mobile-app-shop-floor-first" className="font-medium text-primary hover:underline">
              technician app
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="gallery-heading">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h2 id="gallery-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Circular mils calculator on the phone
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-secondary">
            Product UI for CM Best Match: job inputs, catalog picker, substitution results, and print or email.
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <InputsPhoneMock />
            <CatalogPhoneMock />
            <ResultsPhoneMock />
            <SharePhoneMock />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby="who-heading">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <h2 id="who-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Who it’s for
          </h2>
          <p className="mt-4 text-base leading-relaxed text-secondary">
            Independent rewinders and small shops: full standalone tool—add your own sizes, save mixes, print from the
            truck. Shops already on{" "}
            <Link href="/motor-repair-shop-management-software" className="font-medium text-primary hover:underline">
              IQMotorBase
            </Link>
            : floor techs can use the technician app, which reads the shop wire catalog automatically. Same CM engine,
            different catalog source.
          </p>
        </div>
      </section>

      <section id="pricing" className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-[40rem] px-4 sm:px-6">
          <h2 id="pricing-heading" className="text-center text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Pricing
          </h2>
          <div className="mt-8 rounded-2xl border border-primary/30 bg-card p-6 sm:p-8">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-primary">
              {IQWIRECALCULATOR_TRIAL_DAYS}-day free trial
            </p>
            <p className="mt-2 text-center text-4xl font-bold tabular-nums text-title">${price}</p>
            <p className="mt-1 text-center text-sm text-secondary">per month after trial · cancel anytime</p>
            <ul className="mt-6 space-y-2 text-sm text-secondary">
              <li>Full CM Best Match access</li>
              <li>Unlimited named saves (while subscribed)</li>
              <li>Print and email from the phone</li>
            </ul>
            <div className="mt-8 flex justify-center">
              <IqwireStoreCta align="center" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 id="faq-heading" className="text-center text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-10 divide-y divide-border rounded-2xl border border-border bg-bg">
            {IQWIRECALCULATOR_FAQS.map((faq) => (
              <div key={faq.question} className="px-5 py-5 sm:px-6">
                <dt className="text-base font-semibold text-title">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-secondary">{faq.answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-center text-sm text-secondary">
            App help:{" "}
            <Link href="/support" className="font-medium text-primary hover:underline">
              IQWireCalculator support
            </Link>
            . Longer rewind write-up:{" "}
            <Link
              href="/blog/motor-rewinding-cm-best-match-calculator-guide"
              className="font-medium text-primary hover:underline"
            >
              CM Best Match calculator guide
            </Link>
            . Shop Management System:{" "}
            <Link href="/" className="font-medium text-primary hover:underline">
              IQMotorBase
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-bg py-12 sm:py-16">
        <div className="mx-auto max-w-[40rem] px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">Get the mix off the napkin</h2>
          <p className="mt-3 text-secondary">
            ${price}/mo after a {IQWIRECALCULATOR_TRIAL_DAYS}-day trial. Cancel anytime.
          </p>
          <div className="mt-6 flex justify-center">
            <IqwireStoreCta align="center" />
          </div>
        </div>
      </section>
    </>
  );
}
