import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import {
  IQWIRECALCULATOR_MONTHLY_USD,
  IQWIRECALCULATOR_PATH,
  IQWIRECALCULATOR_PRIVACY_CHOICES_PATH,
  IQWIRECALCULATOR_PRIVACY_PATH,
  IQWIRECALCULATOR_SUPPORT_EMAIL,
  IQWIRECALCULATOR_SUPPORT_PATH,
  IQWIRECALCULATOR_TRIAL_DAYS,
} from "@/lib/iqwirecalculator-marketing";

const mailto = `mailto:${IQWIRECALCULATOR_SUPPORT_EMAIL}?subject=${encodeURIComponent("IQWireCalculator support")}`;
const price = IQWIRECALCULATOR_MONTHLY_USD.toFixed(2);

export const metadata = marketingPageMetadata({
  path: IQWIRECALCULATOR_SUPPORT_PATH,
  title: "IQWireCalculator Support",
  description:
    "Help for the IQWireCalculator iOS and Android app: contact us, manage your subscription, request account deletion, and get answers about CM Best Match.",
  keywords: [
    "IQWireCalculator support",
    "IQWireCalculator help",
    "circular mils calculator app support",
    "IQWireCalculator subscription",
  ],
});

const HELP_TOPICS = [
  {
    title: "Getting started",
    body: "Download IQWireCalculator, create an account, and start the free trial. Open Calcs, enter original wires in hand, original size, original CM, and targeted CM, select catalog sizes, then tap Calculate Best Match.",
  },
  {
    title: "Results, save, print, email",
    body: "On the results screen you can print, email, or save a named calculation. Saved runs appear under View Result. Delete a save with the trash icon. Print uses the phone’s system print dialog.",
  },
  {
    title: "Custom wire sizes",
    body: "Open Select catalog to add shop sizes (including half sizes) with circular mils. Default AWG sizes stay in the table. You can remove only sizes you added.",
  },
  {
    title: "Subscription and billing",
    body: `After a ${IQWIRECALCULATOR_TRIAL_DAYS}-day trial, access is $${price} per month. Open Profile in the app to see status, subscribe, or cancel. Cancelled accounts keep access until the current period ends. Billing is handled through PayPal from the in-app checkout.`,
  },
  {
    title: "Account deletion",
    body: `To delete your IQWireCalculator account and associated saved calculations, email ${IQWIRECALCULATOR_SUPPORT_EMAIL} from the same address you registered. Include “Delete my IQWireCalculator account” in the subject. We will confirm and remove the account.`,
  },
];

const SUPPORT_FAQS = [
  {
    q: "How do I contact support?",
    a: `Email ${IQWIRECALCULATOR_SUPPORT_EMAIL}. Include your account email, device (iPhone or Android), and a short description. We typically reply within one business day.`,
  },
  {
    q: "I cannot sign in or reset my password.",
    a: "Use the sign-in screen in the app. If you still cannot get in, email us from the address on the account and we will help you recover access.",
  },
  {
    q: "How do I cancel so I am not billed again?",
    a: "Open the Profile tab, then Cancel subscription. You keep the app until the date shown. If checkout was through PayPal, you can also manage or cancel the subscription in your PayPal account.",
  },
  {
    q: "The calculator is locked after the trial.",
    a: `That is expected when the ${IQWIRECALCULATOR_TRIAL_DAYS}-day trial ends without an active subscription. Open Profile and subscribe to restore CM Best Match, saves, print, and email.`,
  },
  {
    q: "Is this the same as IQMotorBase shop software?",
    a: "No. IQWireCalculator is a standalone wire calculator app. IQMotorBase is the shop management system. Floor technicians on an IQMotorBase shop should use the technician app, not this listing.",
  },
];

export default function SupportPage() {
  const siteUrl = getPublicSiteUrl();
  const supportUrl = `${siteUrl}${IQWIRECALCULATOR_SUPPORT_PATH}`;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-16 sm:py-24">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]"
          aria-hidden
        />
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <div className="mx-auto max-w-[50.4rem] text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              App support
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl lg:text-6xl">
              IQWireCalculator support
            </h1>
            <p className="mt-5 text-lg text-secondary sm:text-xl">
              Help for the IQWireCalculator iOS and Android app from IQMotorBase. Email us and we will get back
              within one business day.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={mailto}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Email {IQWIRECALCULATOR_SUPPORT_EMAIL}
              </a>
              <Link
                href={IQWIRECALCULATOR_PATH}
                className="inline-flex min-h-12 items-center justify-center rounded-md border-[0.5px] border-border bg-transparent px-5 py-2.5 text-sm font-semibold text-title hover:border-primary/20 hover:bg-card"
              >
                Product page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg py-14 sm:py-20">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-title">Contact</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Publisher: IQMotorBase
                <br />
                App: IQWireCalculator
                <br />
                Email:{" "}
                <a href={mailto} className="font-medium text-primary hover:underline">
                  {IQWIRECALCULATOR_SUPPORT_EMAIL}
                </a>
              </p>
              <p className="mt-3 text-sm text-secondary">Typical reply: one business day.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-title">This support URL</h2>
              <p className="mt-3 break-all text-sm leading-relaxed text-secondary">
                <a href={supportUrl} className="font-medium text-primary hover:underline">
                  {supportUrl}
                </a>
              </p>
              <p className="mt-3 text-sm text-secondary">
                Use this page as the App Store and Google Play support URL for IQWireCalculator.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-title">Legal</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href={IQWIRECALCULATOR_PRIVACY_PATH} className="font-medium text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href={IQWIRECALCULATOR_PRIVACY_CHOICES_PATH}
                    className="font-medium text-primary hover:underline"
                  >
                    User Privacy Choices
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="font-medium text-primary hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href={IQWIRECALCULATOR_PATH} className="font-medium text-primary hover:underline">
                    IQWireCalculator
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-14 sm:py-20">
        <div className="mx-auto max-w-[67.2rem] px-4 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">How we can help</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {HELP_TOPICS.map((topic) => (
              <div key={topic.title} className="rounded-2xl border border-border bg-bg p-6">
                <h3 className="text-base font-semibold text-title">{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{topic.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Frequently asked questions
          </h2>
          <dl className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
            {SUPPORT_FAQS.map((faq) => (
              <div key={faq.q} className="px-5 py-5 sm:px-6">
                <dt className="text-base font-semibold text-title">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-secondary">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-20">
        <div className="mx-auto max-w-[40rem] px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">Still stuck?</h2>
          <p className="mt-3 text-secondary">
            Email{" "}
            <a href={mailto} className="font-medium text-primary hover:underline">
              {IQWIRECALCULATOR_SUPPORT_EMAIL}
            </a>{" "}
            with your account email and we will help.
          </p>
          <p className="mt-6 text-sm text-secondary">
            IQMotorBase shop management system support lives on{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Contact
            </Link>
            . Logged-in shops can also use in-app Support in the dashboard.
          </p>
        </div>
      </section>
    </>
  );
}
