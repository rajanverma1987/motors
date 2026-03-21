import Link from "next/link";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How MotorsWinding.com collects, uses, and protects personal information for visitors, repair shops, and buyers using our website and CRM.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy | MotorsWinding.com",
    description: "Privacy practices for MotorsWinding.com visitors and customers.",
    url: "/privacy",
  },
};

const LAST_UPDATED = "March 9, 2026";

export default function PrivacyPage() {
  const siteUrl = getPublicSiteUrl();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm text-secondary">
        <Link href="/" className="text-primary hover:underline">
          Home
        </Link>
        <span className="mx-2">/</span>
        Privacy Policy
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-secondary">Last updated: {LAST_UPDATED}</p>
      <p className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-secondary">
        This policy describes how <strong className="text-title">MotorsWinding.com</strong> (“we,” “us,” or “our”)
        handles information when you visit our marketing website, create an account, use our software and services, or
        interact with listings and forms. For legal questions about this policy, contact us via{" "}
        <Link href="/contact" className="text-primary font-medium hover:underline">
          Contact
        </Link>
        . We may update this page from time to time; the “Last updated” date will change when we do.
      </p>

      <article className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2 className="text-xl font-semibold text-title">1. Who we are</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          MotorsWinding.com provides software and related services for electric motor repair and rewinding businesses,
          including job management, inventory, lead generation, directory and marketplace features, and related tools. Our
          public website is available at{" "}
          <a href={siteUrl} className="text-primary hover:underline">
            {siteUrl}
          </a>
          .
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">2. Information we collect</h2>
        <p className="mt-3 text-secondary leading-relaxed">Depending on how you use the site, we may collect:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>
            <strong className="text-title">Account and profile data</strong> — such as name, email address, business name,
            phone number, and credentials you provide when you register or use the CRM.
          </li>
          <li>
            <strong className="text-title">Business and operational data</strong> — information you enter into the platform
            (for example customers, work orders, motors, quotes, invoices, inventory, employees, job postings, and
            marketplace listings). This data is processed to provide the service you requested.
          </li>
          <li>
            <strong className="text-title">Communications</strong> — messages you send through contact forms, demo
            requests, support tickets, lead submissions, career applications, and similar channels.
          </li>
          <li>
            <strong className="text-title">Technical and usage data</strong> — such as IP address, browser type, device
            information, general location derived from IP, pages viewed, and timestamps. We use this to operate, secure,
            and improve the service and to understand aggregate usage.
          </li>
          <li>
            <strong className="text-title">Cookies and similar technologies</strong> — we and our analytics partners may
            use cookies, local storage, or similar technologies as described in our cookie and analytics practices (see
            below).
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-title">3. How we use information</h2>
        <p className="mt-3 text-secondary leading-relaxed">We use the information above to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>Provide, maintain, and improve our website, software, and features;</li>
          <li>Authenticate users, prevent fraud and abuse, and protect security;</li>
          <li>Communicate with you about your account, service updates, and support;</li>
          <li>Analyze usage in aggregate to improve product experience and performance;</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-title">4. Analytics and marketing tools</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          We may use third-party analytics or session tools (for example, to understand traffic and product usage). Those
          providers may collect information as described in their own privacy policies. Where required by law, we will seek
          appropriate consent before using non-essential cookies or similar technologies.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">5. Sharing of information</h2>
        <p className="mt-3 text-secondary leading-relaxed">We may share information:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-secondary">
          <li>
            With <strong className="text-title">service providers</strong> who host our infrastructure, send email,
            process payments, or provide security and analytics—only as needed to perform services on our behalf and under
            appropriate safeguards;
          </li>
          <li>
            When <strong className="text-title">you direct us to share</strong> — for example, when your shop profile or
            listing is shown in a public directory, or when you submit a lead or application to another business through
            our platform;
          </li>
          <li>
            For <strong className="text-title">legal reasons</strong> — if we believe disclosure is required by law,
            regulation, legal process, or to protect the rights, safety, or property of our users or the public.
          </li>
        </ul>
        <p className="mt-4 text-secondary leading-relaxed">
          We do not sell your personal information as a commodity. We may use data as described in this policy and in any
          notices we provide at collection.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">6. Data retention</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          We retain information for as long as your account is active, as needed to provide services, and as required for
          legitimate business purposes (such as backups, security, and legal compliance). When you delete content or
          close an account, we may retain certain records for a limited period as permitted by law.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">7. Security</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          We implement reasonable technical and organizational measures designed to protect information against unauthorized
          access, loss, or alteration. No method of transmission over the Internet is completely secure; we cannot
          guarantee absolute security.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">8. Your choices and rights</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          Depending on where you live, you may have rights to access, correct, delete, or export certain personal
          information, or to object to or restrict certain processing. To exercise these rights, contact us through{" "}
          <Link href="/contact" className="text-primary font-medium hover:underline">
            Contact
          </Link>
          . We may need to verify your request. If you are in the European Economic Area, UK, or other regions with
          specific privacy laws, additional rights may apply; we will respond in accordance with applicable law.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">9. Children’s privacy</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          Our services are not directed to children under 16 (or the minimum age in your jurisdiction). We do not
          knowingly collect personal information from children. If you believe we have collected information from a child,
          please contact us and we will take appropriate steps.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">10. International users</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          If you access the service from outside the United States, your information may be processed in the United States
          or other countries where we or our providers operate. Those countries may have different data protection rules
          than your country.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">11. Changes to this policy</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          We may update this Privacy Policy from time to time. We will post the revised policy on this page and update
          the “Last updated” date. For material changes, we may provide additional notice (for example, by email or a
          notice in the product).
        </p>

        <h2 className="mt-10 text-xl font-semibold text-title">12. Contact</h2>
        <p className="mt-3 text-secondary leading-relaxed">
          Questions about this Privacy Policy: use our{" "}
          <Link href="/contact" className="text-primary font-medium hover:underline">
            contact form
          </Link>
          . For contractual terms governing use of the service, see our{" "}
          <Link href="/terms" className="text-primary font-medium hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
