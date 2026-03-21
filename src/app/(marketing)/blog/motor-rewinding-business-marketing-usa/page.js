import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import { SEO_USA_HUB_PATH, SEO_USA_STATES } from "@/lib/seo-usa-config";

const path = "/blog/motor-rewinding-business-marketing-usa";

export const metadata = {
  title: "Motor Rewinding Business Marketing in the USA",
  description:
    "How rewinding shops compete in US industrial markets: geography, vertical focus, emergency positioning, and digital trust signals.",
  keywords: ["motor rewinding marketing", "rewind shop USA", "electric motor rewinding leads"],
  openGraph: {
    title: "Motor Rewinding Business Marketing in the USA | MotorsWinding.com",
    description: "Geography, verticals, and trust for US rewind shops.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogRewindingMarketingPage() {
  const sampleStates = SEO_USA_STATES.slice(0, 5);
  return (
    <BlogPageLayout
      title="Motor rewinding business marketing in the USA"
      description="Rewinding isn’t a commodity—buyers care about coil data, insulation class, turn counts, vacuum pressure impregnation, and whether you’ll stand behind the warranty. Marketing should communicate competence, not lowest price."
      breadcrumbLink={{ href: "/blog", label: "Blog" }}
      canonicalPath={path}
      sidebarTitle="Get found + stay organized"
      sidebarDescription="List your shop and run jobs with MotorsWinding.com."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-secondary leading-relaxed">
          Anchor your funnel with the{" "}
          <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
            USA motor repair business listing
          </Link>{" "}
          hub, then drill into states where your travel radius and certifications match demand—examples:{" "}
          {sampleStates.map((s, i) => (
            <span key={s.slug}>
              {i > 0 && ", "}
              <Link href={`/usa/${s.slug}/motor-repair-business-listing`} className="text-primary font-medium hover:underline">
                {s.name}
              </Link>
            </span>
          ))}
          .
        </p>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Own your geography honestly</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            US buyers filter by distance and drive time—especially for emergencies. Publish realistic service radii and pickup/delivery policies. If you serve multiple states, say how you handle freight and who coordinates rigging. Ambiguity loses deals.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Verticals: speak the buyer’s language</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Water/wastewater, chemical, aggregates, food, data centers, and OEM line builders all stress motors differently. Case-style blurbs (“rewinds for 400HP crusher duty”) outperform generic claims. You’re not narrowing the market—you’re increasing close rate.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Emergency positioning without burning out</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            24/7 call answering is expensive; clear after-hours escalation isn’t. Define what “rush” means in calendar hours and what data you need up front. Customers accept boundaries when you communicate them upfront.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Pair visibility with workflow</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Marketing brings conversations;{" "}
            <Link href="/job-card-system-for-repair-shop" className="text-primary font-medium hover:underline">
              job cards
            </Link>{" "}
            and{" "}
            <Link href="/blog/how-to-manage-repair-jobs-efficiently" className="text-primary font-medium hover:underline">
              efficient job management
            </Link>{" "}
            protect margin. If operations can’t keep up, more marketing only amplifies chaos.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">Related</h2>
          <ul className="mt-4 space-y-2 text-secondary">
            <li>
              <Link href="/blog/how-to-get-more-customers-for-motor-repair-shop" className="text-primary font-medium hover:underline">
                How to get more customers for a motor repair shop
              </Link>
            </li>
            <li>
              <Link href="/blog/best-software-for-repair-shop-2026" className="text-primary font-medium hover:underline">
                Best software for a repair shop in 2026
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </BlogPageLayout>
  );
}
