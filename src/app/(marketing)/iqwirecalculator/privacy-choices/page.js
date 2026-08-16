import Link from "next/link";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import {
  IQWIRECALCULATOR_PATH,
  IQWIRECALCULATOR_PRIVACY_CHOICES_PATH,
  IQWIRECALCULATOR_PRIVACY_PATH,
  IQWIRECALCULATOR_SUPPORT_EMAIL,
  IQWIRECALCULATOR_SUPPORT_PATH,
} from "@/lib/iqwirecalculator-marketing";

const LAST_UPDATED = "August 16, 2026";
const mailto = `mailto:${IQWIRECALCULATOR_SUPPORT_EMAIL}?subject=${encodeURIComponent("IQWireCalculator privacy request")}`;
const deleteMailto = `mailto:${IQWIRECALCULATOR_SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my IQWireCalculator account")}`;

export const metadata = marketingPageMetadata({
  path: IQWIRECALCULATOR_PRIVACY_CHOICES_PATH,
  title: "IQWireCalculator User Privacy Choices",
  description:
    "How to access, correct, or delete your IQWireCalculator data, opt out of sale/sharing, and manage your account.",
});

export default function IqwirecalculatorPrivacyChoicesPage() {
  return (
    <div className="mx-auto max-w-[57.6rem] px-4 py-12 sm:px-6">
      <p className="text-sm text-secondary">
        <Link href="/" className="text-primary hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href={IQWIRECALCULATOR_PATH} className="text-primary hover:underline">
          IQWireCalculator
        </Link>
        <span className="mx-2">/</span>
        User Privacy Choices
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">
        IQWireCalculator User Privacy Choices
      </h1>
      <p className="mt-2 text-sm text-secondary">Last updated: {LAST_UPDATED}</p>
      <p className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-secondary">
        Use this page to control how IQMotorBase uses personal information from the{" "}
        <strong className="text-title">IQWireCalculator</strong> app. Full details are in the{" "}
        <Link href={IQWIRECALCULATOR_PRIVACY_PATH} className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <article className="mt-10 max-w-none">
        <h2 className="text-xl font-semibold text-title">We do not sell or share for ads</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          We do not sell your personal information. We do not share it for cross-context behavioral advertising. The
          app does not use the iOS advertising identifier (IDFA) to track you across other companies’ apps or websites.
          There is no “Do Not Sell or Share” toggle to flip because that activity is not part of IQWireCalculator.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">Choices in the app</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>
            <strong className="text-title">Profile</strong> — update your name and phone; cancel a subscription.
          </li>
          <li>
            <strong className="text-title">Saved calculations</strong> — delete named saves with the trash control.
          </li>
          <li>
            <strong className="text-title">Custom wire sizes</strong> — remove sizes you added (default AWG sizes stay).
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-title">Access or correct your data</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          Email{" "}
          <a href={mailto} className="font-medium text-primary hover:underline">
            {IQWIRECALCULATOR_SUPPORT_EMAIL}
          </a>{" "}
          from the address on the account. Ask for a copy of your account data or a correction. We may need to verify
          it is you. We typically reply within one business day, and complete verified requests within 45 days (or
          sooner if local law requires).
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">Delete your account</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          Email{" "}
          <a href={deleteMailto} className="font-medium text-primary hover:underline">
            {IQWIRECALCULATOR_SUPPORT_EMAIL}
          </a>{" "}
          with the subject “Delete my IQWireCalculator account.” We will delete the account and associated saved
          calculations. Billing records may be kept as required by law. Cancel the subscription in Profile first if you
          do not want another charge.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">California, EEA, UK, and similar laws</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          Depending on where you live, you may have rights to know, access, correct, delete, port, or limit certain
          processing, and to appeal a denied request. Submit those requests to the same email. We will not discriminate
          against you for exercising privacy rights. Authorized agents may contact us; we still verify the consumer.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">Contact</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          <a href={mailto} className="font-medium text-primary hover:underline">
            {IQWIRECALCULATOR_SUPPORT_EMAIL}
          </a>
          {" · "}
          <Link href={IQWIRECALCULATOR_SUPPORT_PATH} className="font-medium text-primary hover:underline">
            App support
          </Link>
        </p>
      </article>
    </div>
  );
}
