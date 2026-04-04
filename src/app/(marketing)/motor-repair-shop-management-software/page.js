import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/motor-repair-shop-management-software";

export const metadata = {
  title: "Motor Repair Shop Management Software | Jobs, Quotes & Inventory",
  description:
    "What motor repair and rewinding shops should look for in management software: job cards, quotes, invoicing, parts, and lead capture—without generic field-service bloat.",
  keywords: [
    "motor repair shop management software",
    "electric motor repair CRM",
    "rewinding shop software",
    "motor shop job tracking",
  ],
  openGraph: {
    title: "Motor Repair Shop Management Software | MotorsWinding.com",
    description:
      "Run quotes, jobs, and billing in a system built for motor repair—not generic tickets.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Motor Repair Shop Management Software | MotorsWinding.com",
    description: "Job cards, quotes, and shop workflow tuned for motor repair businesses.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function MotorRepairShopManagementSoftwarePage() {
  return (
    <BlogPageLayout
      title="Motor repair shop management software that matches the floor"
      description="Generic field-service tools treat every job like a truck roll. Motor repair shops need winding specs, test data, parts compatibility, and clear WIP—here’s how to evaluate software without drowning in features you’ll never use."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="A System that manages everything..."
      sidebarDescription="Request info and CRM access for your repair center."
      sidebarCta={<SeoLeadMiniForm sourcePage={path} />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-2">
            Why “any CRM” fails motor repair businesses
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Most CRMs are built for sales pipelines or break/fix dispatch. Motor repair and rewinding has a different rhythm: incoming motors with unknown failure modes, disassembly approvals, coil data, balancing, and final electrical tests. Software that only tracks “status = in progress” loses the detail your techs actually need—and your customers ask about when they pay.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Good motor shop management ties together <strong className="text-title">lead intake</strong>,{" "}
            <strong className="text-title">technical scope</strong>, <strong className="text-title">labor and parts</strong>, and{" "}
            <strong className="text-title">billing</strong> so nothing is re-keyed three times between the counter and the bench.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Core modules that actually matter
          </h2>
          <ul className="mt-4 list-none space-y-3 p-0 text-secondary">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong className="text-title">Quotes with line-item labor and material</strong> — Motor jobs are rarely flat-rate; your system should support multiple labor rates, rush fees, and parts markup without spreadsheet sidecars.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong className="text-title">Job cards / work orders</strong> — A durable record of what was found, what was approved, and what shipped—see also our guide to{" "}
                <Link href="/job-card-system-for-repair-shop" className="text-primary font-medium hover:underline">
                  job card systems for repair shops
                </Link>
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong className="text-title">Parts and core handling</strong> — Even a lean shop needs to know what’s on hand for common bearings, seals, and insulation—before promising a date.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong className="text-title">Customer-visible professionalism</strong> — Branded PDFs, consistent terms, and fast responses beat low price when plants compare vendors.
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Visibility + operations: the full stack
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            The best outcomes pair <strong className="text-title">discoverability</strong> with <strong className="text-title">execution</strong>. A directory listing alone doesn’t move WIP; a job system alone doesn’t fill the funnel. That’s why MotorsWinding.com combines lead-oriented profiles with CRM workflows—so you’re not duct-taping two products together.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Start from our USA hub:{" "}
            <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
              motor repair business listing (USA)
            </Link>
            , then explore state and city pages if you want localized positioning for industrial-heavy regions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Security, access, and who sees what
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Shops often juggle inside sales, bench techs, and field techs. Role-based access, audit-friendly job history, and predictable backups matter before you scale headcount. If your current stack is a shared inbox and a folder of photos, you’re one departure away from losing tribal knowledge.
          </p>
        </section>

        <MarketingRelatedGuides audience="shop" excludeHref={path} className="mt-12 border-t border-border pt-10" />
        <p className="mt-6 text-sm text-secondary">
          Deep dive:{" "}
          <Link href="/blog/best-software-for-repair-shop-2026" className="text-primary font-medium hover:underline">
            best software for repair shops in 2026
          </Link>
          .
        </p>
      </article>
    </BlogPageLayout>
  );
}
