import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import IqMotorTrackPwaInstall from "@/components/marketing/iqmotortrack/pwa-install";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  IQMOTORTRACK_APP_PATH,
  IQMOTORTRACK_FAQS,
  IQMOTORTRACK_FREE_MOTOR_LIMIT,
  IQMOTORTRACK_KEYWORDS,
  IQMOTORTRACK_MARKETING_PATH,
  IQMOTORTRACK_META_DESCRIPTION,
  IQMOTORTRACK_MONTHLY_USD,
  IQMOTORTRACK_OTHER_USER_BENEFITS,
  IQMOTORTRACK_PAGE_TITLE,
  IQMOTORTRACK_PLANT_MANAGER_BENEFITS,
} from "@/lib/iqmotortrack-marketing";

const path = IQMOTORTRACK_MARKETING_PATH;
const monthly = IQMOTORTRACK_MONTHLY_USD.toFixed(2);
const freeLimit = IQMOTORTRACK_FREE_MOTOR_LIMIT;

export const metadata = {
  title: { absolute: IQMOTORTRACK_PAGE_TITLE },
  description: IQMOTORTRACK_META_DESCRIPTION,
  keywords: IQMOTORTRACK_KEYWORDS,
  openGraph: {
    title: IQMOTORTRACK_PAGE_TITLE,
    description: IQMOTORTRACK_META_DESCRIPTION,
    url: path,
    type: "website",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: IQMOTORTRACK_PAGE_TITLE,
    description: IQMOTORTRACK_META_DESCRIPTION,
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const steps = [
  {
    n: "1",
    title: "Register every motor",
    body: "Capture nameplate, location, criticality, and photos so the plant has one source of truth for motor maintenance and repair.",
  },
  {
    n: "2",
    title: "Log service and maintenance",
    body: "Keep history and notes on the asset. When the next failure hits, your team already knows what was done last time.",
  },
  {
    n: "3",
    title: "Motor down, send RFQ",
    body: "Mark a motor down and invite repair shops with the motor data attached. Compare proposals in one place.",
  },
  {
    n: "4",
    title: "Award and keep the datasheet",
    body: "Technical data from the awarded shop flows back into your motor record so the next job starts complete.",
  },
];

function JsonLd() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${path}`;
  const appUrl = `${site}${IQMOTORTRACK_APP_PATH}`;
  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IQMotorTrack",
    url: pageUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    installUrl: appUrl,
    description: IQMOTORTRACK_META_DESCRIPTION,
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: `Free for up to ${freeLimit} motors`,
      },
      {
        "@type": "Offer",
        price: monthly,
        priceCurrency: "USD",
        description: `Pro $${monthly} per month, unlimited motors, PayPal subscription`,
      },
    ],
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: IQMOTORTRACK_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How plant teams use IQMotorTrack for motor maintenance and repair",
    description: "Register motors, log service, and send multi-shop RFQs when a motor goes down.",
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

export default function MotorMaintenanceAndRepairPage() {
  return (
    <>
      <JsonLd />

      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            IQMotorTrack · Motor maintenance and repair
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Motor Maintenance and Repair Software Built for Plant Managers
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
            IQMotorTrack is the plant&apos;s system of record for every electric motor. Register assets, track service
            history, and send multi-shop RFQs when a motor goes down. Free for {freeLimit} motors. Pro ${monthly}/month
            via PayPal for unlimited motors.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={IQMOTORTRACK_APP_PATH}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Open IQMotorTrack
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-title hover:bg-bg"
            >
              See pricing
            </a>
            <a href="#install" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              Scan QR for mobile
            </a>
          </div>
        </div>
      </section>

      <div id="install">
        <IqMotorTrackPwaInstall />
      </div>

      <section className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="managers-heading">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h2 id="managers-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Benefits for plant managers
          </h2>
          <p className="mt-3 max-w-2xl text-secondary">
            Built for motor maintenance and repair ownership on the plant side, not for shop floor rewind math.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IQMOTORTRACK_PLANT_MANAGER_BENEFITS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-title">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby="users-heading">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h2 id="users-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Benefits for other users
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {IQMOTORTRACK_OTHER_USER_BENEFITS.map((item) => (
              <div key={item.role} className="rounded-2xl border border-border bg-bg p-5">
                <h3 className="text-base font-semibold text-title">{item.role}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="how-heading">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            How motor maintenance and repair works in IQMotorTrack
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.n} className="rounded-2xl border border-border bg-card p-5">
                <span className="text-sm font-bold text-primary">{step.n}</span>
                <h3 className="mt-2 text-base font-semibold text-title">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="border-b border-border bg-card py-12 sm:py-16" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <h2 id="pricing-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Pricing and free tier
          </h2>
          <p className="mt-3 text-secondary">
            Clear limits. PayPal subscription for Pro. No App Store billing.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-bg p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Free</p>
              <p className="mt-2 text-3xl font-extrabold text-title">$0</p>
              <p className="mt-1 text-sm text-secondary">Up to {freeLimit} motors. All core features.</p>
              <ul className="mt-4 space-y-2 text-sm text-secondary">
                <li>Motor register and status</li>
                <li>Maintenance and service notes</li>
                <li>Installable phone PWA</li>
                <li>Upgrade gate on the 6th motor</li>
              </ul>
              <Link
                href={IQMOTORTRACK_APP_PATH}
                className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-title hover:bg-bg"
              >
                Start free
              </Link>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Pro</p>
              <p className="mt-2 text-3xl font-extrabold text-title">${monthly}</p>
              <p className="mt-1 text-sm text-secondary">Per month via PayPal. Unlimited motors.</p>
              <ul className="mt-4 space-y-2 text-sm text-secondary">
                <li>Everything in Free</li>
                <li>Unlimited motor records</li>
                <li>PayPal subscription, cancel anytime in Profile</li>
                <li>Same plant login on phone or desktop browser</li>
              </ul>
              <Link
                href={IQMOTORTRACK_APP_PATH}
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Open app and subscribe
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg py-12 sm:py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            FAQ
          </h2>
          <dl className="mt-8 space-y-6">
            {IQMOTORTRACK_FAQS.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-title">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-secondary">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-card py-12 sm:py-16">
        <div className="mx-auto max-w-[67.2rem] px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Ready for clearer motor maintenance and repair?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-secondary">
            Scan the QR above or open the app. Free for {freeLimit} motors. Pro ${monthly}/month when you need more.
          </p>
          <Link
            href={IQMOTORTRACK_APP_PATH}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Launch IQMotorTrack
          </Link>
          <p className="mt-4 text-sm text-secondary">
            Deep dive:{" "}
            <Link
              href="/blog/plant-motor-maintenance-and-repair-software-iqmotortrack"
              className="font-medium text-primary hover:underline"
            >
              Plant motor maintenance and repair software guide
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
