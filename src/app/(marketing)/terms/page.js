import Link from "next/link";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms governing use of MotorsWinding.com, including accounts, software, directory listings, marketplace features, and limitations of liability.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms of Service | MotorsWinding.com",
    description: "Terms of use for MotorsWinding.com software and website.",
    url: "/terms",
  },
};

const LAST_UPDATED = "March 9, 2026";

export default function TermsPage() {
  const siteUrl = getPublicSiteUrl();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm text-secondary">
        <Link href="/" className="text-primary hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        Terms of Service
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-secondary">Last updated: {LAST_UPDATED}</p>
      <p className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-secondary">
        These Terms of Service (“Terms”) govern your access to and use of the website, software, and related services
        offered by <strong className="text-title">MotorsWinding.com</strong> (“Service”). By accessing or using the
        Service, you agree to these Terms. If you do not agree, do not use the Service. See also our{" "}
        <Link href="/privacy" className="text-primary font-medium hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <article className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2 className="text-xl font-semibold text-title">1. The Service</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          MotorsWinding.com provides cloud-based tools for motor repair and rewinding businesses and related features,
          including but not limited to job and customer management, inventory, quotes and invoicing, integrations, lead
          and directory features, marketplace listings, career postings, and public marketing pages. The Service is offered
          at{" "}
          <a href={siteUrl} className="text-primary hover:underline">
            {siteUrl}
          </a>{" "}
          and related URLs we operate.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">2. Eligibility and accounts</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          You must have authority to enter these Terms on behalf of yourself or your organization. You are responsible
          for maintaining the confidentiality of your login credentials and for all activity under your account. You must
          provide accurate registration information and keep it up to date. We may suspend or terminate accounts that
          violate these Terms or pose a security risk.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">3. Acceptable use</h2>
        <p className="mt-3 text-secondary leading-relaxed">You agree not to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>Use the Service in violation of any law or regulation;</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
          <li>Introduce malware, overload infrastructure, or interfere with other users’ use of the Service;</li>
          <li>Scrape, crawl, or harvest data from the Service in an automated way without our written permission;</li>
          <li>Use the Service to send spam, deceptive communications, or harassing content;</li>
          <li>Reverse engineer or attempt to extract source code from the Service except where permitted by law.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-title">4. Your content and data</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          You retain ownership of data and content you submit to the Service (“Your Content”). You grant us a
          non-exclusive, worldwide license to host, process, transmit, display, and copy Your Content solely as
          necessary to provide, secure, and improve the Service and as described in our Privacy Policy. You represent that
          you have the rights needed to submit Your Content and that it does not infringe third-party rights.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Public-facing information (such as directory listings, marketplace items, or job postings you choose to
          publish) may be visible to visitors and search engines. You are responsible for what you publish and for
          complying with applicable employment, advertising, and industry rules.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">5. Our intellectual property</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          The Service, including software, branding, documentation, and marketing materials, is protected by intellectual
          property laws. Except for the limited rights expressly granted in these Terms, we reserve all rights. You may not
          remove proprietary notices or use our trademarks without prior written consent.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">6. Third-party services</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          The Service may integrate with or link to third-party services (for example payment processors, analytics, or
          carriers). Your use of those services may be subject to separate terms and privacy policies. We are not
          responsible for third-party services we do not control.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">7. Fees and subscription</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          Certain features may require payment or a subscription. Fees, billing cycles, and taxes will be presented at
          purchase or in your order. Unless otherwise stated, fees are non-refundable except as required by law or as we
          specify in writing. We may change pricing with reasonable notice where required.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">8. Disclaimers</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
          WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
          A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
          OR FREE OF HARMFUL COMPONENTS. DIRECTORY LISTINGS, MARKETPLACE CONTENT, AND THIRD-PARTY INFORMATION ARE PROVIDED
          FOR CONVENIENCE; WE DO NOT ENDORSE OR GUARANTEE THE ACCURACY OF THIRD-PARTY CONTENT.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">9. Limitation of liability</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL MOTORSWINDING.COM OR ITS AFFILIATES, OFFICERS,
          DIRECTORS, EMPLOYEES, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO THESE
          TERMS OR THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE
          GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM, OR (B) ONE
          HUNDRED U.S. DOLLARS (US $100), IF YOU HAVE NOT PAID US. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN
          THOSE CASES OUR LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">10. Indemnity</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          You will defend, indemnify, and hold harmless MotorsWinding.com and its affiliates from and against any claims,
          damages, losses, and expenses (including reasonable attorneys’ fees) arising out of Your Content, your use of
          the Service in violation of these Terms, or your violation of applicable law or third-party rights.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">11. Termination</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          You may stop using the Service at any time. We may suspend or terminate access to the Service if you materially
          breach these Terms, if we are required to do so by law, or if we discontinue the Service (with reasonable notice
          where practicable). Provisions that by their nature should survive (including ownership, disclaimers, limitation
          of liability, and indemnity) will survive termination.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">12. Governing law and disputes</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          These Terms are governed by the laws of the United States and the State of Delaware, excluding conflict-of-law
          rules, unless mandatory consumer protection laws in your jurisdiction require otherwise. You agree that courts
          located in Delaware have exclusive jurisdiction for disputes arising from these Terms or the Service, subject
          to any right you may have to bring claims in your local courts where required by law.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">13. Changes to these Terms</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          We may modify these Terms from time to time. We will post the updated Terms on this page and update the “Last
          updated” date. If changes are material, we may provide additional notice. Continued use of the Service after
          changes become effective constitutes acceptance of the revised Terms.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">14. Contact</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          Questions about these Terms: use our{" "}
          <Link href="/contact" className="text-primary font-medium hover:underline">
            contact form
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
