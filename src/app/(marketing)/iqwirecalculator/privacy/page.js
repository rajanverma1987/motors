import Link from "next/link";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import {
  IQWIRECALCULATOR_PATH,
  IQWIRECALCULATOR_PRIVACY_CHOICES_PATH,
  IQWIRECALCULATOR_PRIVACY_PATH,
  IQWIRECALCULATOR_SUPPORT_EMAIL,
  IQWIRECALCULATOR_SUPPORT_PATH,
} from "@/lib/iqwirecalculator-marketing";

const LAST_UPDATED = "August 16, 2026";
const mailto = `mailto:${IQWIRECALCULATOR_SUPPORT_EMAIL}?subject=${encodeURIComponent("IQWireCalculator privacy")}`;

export const metadata = marketingPageMetadata({
  path: IQWIRECALCULATOR_PRIVACY_PATH,
  title: "IQWireCalculator Privacy Policy",
  description:
    "Privacy policy for the IQWireCalculator iOS and Android app: what we collect, how we use it, and how to request deletion.",
});

export default function IqwirecalculatorPrivacyPage() {
  const siteUrl = getPublicSiteUrl();

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
        Privacy Policy
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">
        IQWireCalculator Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-secondary">Last updated: {LAST_UPDATED}</p>
      <p className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-secondary">
        This policy applies to the <strong className="text-title">IQWireCalculator</strong> mobile app published by
        IQMotorBase (“we,” “us,” or “our”). It describes information collected when you create an account, use CM Best
        Match, save calculations, or subscribe. For website and shop management system privacy, see our{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          website Privacy Policy
        </Link>
        . To make privacy requests, use{" "}
        <Link href={IQWIRECALCULATOR_PRIVACY_CHOICES_PATH} className="font-medium text-primary hover:underline">
          User Privacy Choices
        </Link>
        .
      </p>

      <article className="mt-10 max-w-none">
        <h2 className="text-xl font-semibold text-title">1. Who we are</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          IQWireCalculator is a standalone circular mils / wire substitution calculator for motor rewind work. It is
          not the IQMotorBase shop management system. The app and related services are operated at{" "}
          <a href={siteUrl} className="text-primary hover:underline">
            {siteUrl}
          </a>
          .
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">2. Information we collect</h2>
        <p className="mt-3 leading-relaxed text-secondary">We collect:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>
            <strong className="text-title">Account data</strong>, name, email, password (stored as a hash), phone, and
            country you provide at registration or in Profile.
          </li>
          <li>
            <strong className="text-title">App content</strong>, calculation inputs and results you save (including
            wire sizes, circular mils, and named saves) and custom wire sizes you add to your catalog.
          </li>
          <li>
            <strong className="text-title">Subscription and payment data</strong>, trial and subscription status,
            period dates, and PayPal identifiers needed to bill and cancel. Card details are handled by PayPal, not
            stored in the app.
          </li>
          <li>
            <strong className="text-title">Technical data</strong>, IP address, timestamps, and basic device/request
            information when the app talks to our servers (sign-in, saves, catalog sync, checkout). A session token is
            stored on the device.
          </li>
        </ul>
        <p className="mt-4 leading-relaxed text-secondary">
          Print and email of results use the device’s print and mail tools. Recipients you choose receive the content
          you send. We do not use the iOS advertising identifier (IDFA) for tracking in this app.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">3. How we use information</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>Create and authenticate your account and keep you signed in;</li>
          <li>Run and store CM Best Match calculations and your custom wire catalog;</li>
          <li>Provide the free trial, paid subscription, and cancellation;</li>
          <li>Respond to support requests and protect the service against abuse;</li>
          <li>Comply with law and enforce our terms.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-title">4. Sharing</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          We share information with service providers who host the app backend, send email, and process PayPal
          payments, only as needed to operate IQWireCalculator. We may disclose information if required by law or to
          protect users and the public. We do not sell your personal information, and we do not share it for
          cross-app advertising.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">5. Retention and security</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          We keep account and saved calculation data while the account is open, and for a limited time afterward as
          needed for backups, billing records, and legal requirements. We use reasonable technical and organizational
          measures to protect information. No internet transmission is completely secure.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">6. Your choices</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          You can update name and phone in the Profile tab. You can delete saved calculations in the app. You can
          cancel a subscription in Profile (access continues until the period end). To access, correct, or delete your
          account, follow{" "}
          <Link href={IQWIRECALCULATOR_PRIVACY_CHOICES_PATH} className="font-medium text-primary hover:underline">
            User Privacy Choices
          </Link>
          . Depending on where you live, additional rights may apply; we will respond in line with applicable law after
          verifying your request.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">7. Children</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          IQWireCalculator is not directed to children under 16 (or the minimum age in your jurisdiction). We do not
          knowingly collect personal information from children.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">8. International users</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          If you use the app from outside the United States, your information may be processed in the United States or
          other countries where we or our providers operate.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">9. Changes</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          We may update this policy and will change the “Last updated” date on this page. Material changes may also be
          noted in the app or by email.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">10. Contact</h2>
        <p className="mt-3 leading-relaxed text-secondary">
          Privacy questions:{" "}
          <a href={mailto} className="font-medium text-primary hover:underline">
            {IQWIRECALCULATOR_SUPPORT_EMAIL}
          </a>
          . App help:{" "}
          <Link href={IQWIRECALCULATOR_SUPPORT_PATH} className="font-medium text-primary hover:underline">
            Support
          </Link>
          . Terms:{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
