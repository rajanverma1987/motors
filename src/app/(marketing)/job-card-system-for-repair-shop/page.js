import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/job-card-system-for-repair-shop";

export const metadata = {
  title: "Job Card System for Motor Repair Shops | Work Orders Done Right",
  description:
    "How a proper job card system reduces rework, speeds billing, and protects your shop when scope changes—especially for electric motor repair and rewinding.",
  keywords: [
    "job card system repair shop",
    "motor repair work order",
    "electric motor job card",
    "rewinding shop paperwork",
  ],
  openGraph: {
    title: "Job Card System for Repair Shops | MotorsWinding.com",
    description:
      "Structure teardown, approval, labor, parts, and testing so every job is traceable.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Job Card System for Repair Shops | MotorsWinding.com",
    description: "Traceable work orders for motor repair and rewinding.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function JobCardSystemForRepairShopPage() {
  return (
    <BlogPageLayout
      title="Job card system for a motor repair shop (that techs will actually use)"
      description="Paper isn’t evil—chaos is. Whether you’re on clipboards or tablets, the job card is the contract between what the customer authorized and what the floor delivered. Here’s how to structure it for motor work."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="Run jobs in one workspace"
      sidebarDescription="Pair structured job cards with quotes and invoicing built for repair shops."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-2">
            What belongs on a motor repair job card
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            At minimum: customer, asset ID, horsepower/voltage, failure description, visual inspection notes, measured data (megger, hi-pot where applicable), customer approvals for extra work, parts used, labor hours by department, and final test results. Skipping any of these is how disputes start—“you didn’t tell me the bearing seat was damaged”—after the motor is already back in service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            From verbal approval to documented change orders
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Emergency jobs love verbal OKs. Your job card system should make it painless to attach a change order before the coil is wound or the sleeve is cut. Digital systems win here because photos, signatures, and timestamps live next to the scope—not in someone’s text messages.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            If you’re evaluating software, read{" "}
            <Link href="/motor-repair-shop-management-software" className="text-primary font-medium hover:underline">
              motor repair shop management software
            </Link>{" "}
            for the bigger picture on quotes, inventory, and billing tied to the same record.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Bench discipline = predictable cash flow
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            When job cards flow cleanly to invoicing, finance stops chasing techs for hours. Tie labor lines to departments (mechanical vs. electrical vs. field) so you can see where you’re earning margin—and where you’re donating time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Lead generation still feeds the front of the funnel
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Operational excellence doesn’t matter if the phone doesn’t ring. List your business where industrial buyers search, then convert inquiries into job cards without retyping:{" "}
            <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
              Motor repair business listing — USA
            </Link>
            .
          </p>
        </section>

        <MarketingRelatedGuides audience="shop" excludeHref={path} className="mt-12 border-t border-border pt-10" />
        <p className="mt-6 text-sm text-secondary">
          Read:{" "}
          <Link href="/blog/how-to-manage-repair-jobs-efficiently" className="text-primary font-medium hover:underline">
            how to manage repair jobs efficiently
          </Link>
          .
        </p>
      </article>
    </BlogPageLayout>
  );
}
