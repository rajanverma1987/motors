import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/track-motor-repair-jobs";

export const metadata = {
  title: "Track Motor Repair Jobs | WIP, Lead Times & Customer Updates",
  description:
    "Practical ways motor repair shops track work-in-progress, communicate lead times, and reduce status calls—without living in spreadsheets.",
  keywords: [
    "track motor repair jobs",
    "motor shop WIP",
    "repair shop lead time",
    "motor rewinding status tracking",
  ],
  openGraph: {
    title: "Track Motor Repair Jobs | MotorsWinding.com",
    description:
      "See what’s on the floor, what’s waiting on parts, and what’s ready to invoice.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Track Motor Repair Jobs | MotorsWinding.com",
    description: "WIP visibility for motor repair and rewinding shops.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function TrackMotorRepairJobsPage() {
  return (
    <BlogPageLayout
      title="Track motor repair jobs with fewer status calls"
      description="Plants call when they’re nervous. The fix isn’t more meetings—it’s predictable updates tied to real job states: intake, disassembly, quote pending, waiting on parts, in rewind, test, ship. Here’s how shops tighten WIP visibility without hiring a dispatcher."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="Quotes → jobs → billing"
      sidebarDescription="Keep the whole lifecycle in one CRM instead of sticky notes."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-2">
            Define statuses that match your floor—not software defaults
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Generic statuses like “Open/Closed” don’t help a rewind department. Consider stages such as Intake, Disassembly/Inspect, Quote Sent, Waiting on PO, In Mechanical, In Electrical, Balance, Final Test, Ready to Ship, Invoiced. The right granularity ends hallway conversations and makes load visible to sales.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Tie tracking to parts and vendors
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Most delays aren’t technical—they’re bearings on backorder or a sleeve taking an extra week. When your job record links to parts status, you answer customer questions with facts, not guesses. That’s also where{" "}
            <Link href="/job-card-system-for-repair-shop" className="text-primary font-medium hover:underline">
              structured job cards
            </Link>{" "}
            pay off: the story is in one place.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Pipeline vs. capacity planning
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Tracking isn’t only for customers—it’s for you. When you see WIP aging by stage, you can rebalance techs, outsource overflow, or adjust quoted lead times seasonally. Shops that track well protect margin; shops that don’t burn overtime to cover planning gaps.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Fill the funnel, then execute
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Tracking helps existing jobs; marketing brings the next ones. Start with a strong listing and localized pages for industrial regions:{" "}
            <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
              Motor repair business listing — USA
            </Link>
            . Pair with{" "}
            <Link href="/blog/how-to-get-more-customers-for-motor-repair-shop" className="text-primary font-medium hover:underline">
              customer acquisition tactics
            </Link>{" "}
            so WIP reflects growth—not just chaos.
          </p>
        </section>

        <MarketingRelatedGuides audience="shop" excludeHref={path} className="mt-12 border-t border-border pt-10" />
      </article>
    </BlogPageLayout>
  );
}
