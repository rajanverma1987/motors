import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/blog/how-to-get-more-customers-for-motor-repair-shop";

export const metadata = {
  title: "How to Get More Customers for a Motor Repair Shop",
  description:
    "Actionable ways electric motor repair and rewinding shops attract more industrial buyers: visibility, speed, proof, and follow-up—without gimmicks.",
  keywords: ["motor repair shop customers", "motor rewinding leads", "industrial motor repair marketing"],
  openGraph: {
    title: "How to Get More Customers for a Motor Repair Shop | MotorsWinding.com",
    description: "Visibility, response discipline, and trust signals that win quotes.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogMoreCustomersPage() {
  return (
    <BlogPageLayout
      title="How to get more customers for a motor repair shop"
      description="You don’t need viral social posts—you need to show up when a plant searches, answer fast, and prove you can handle their voltage range and turnaround. Here’s a practical playbook for owners."
      breadcrumbLink={{ href: "/blog", label: "Blog" }}
      canonicalPath={path}
      sidebarTitle="List where buyers search"
      sidebarDescription="Use our USA hub + state/city pages to localize your reach, then convert with the CRM."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-secondary leading-relaxed">
          <strong className="text-title">Start here:</strong>{" "}
          <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
            Motor repair business listing — USA
          </Link>{" "}
          connects national intent to state and city pages where industrial density is highest—use them as landing companions to your shop profile.
        </p>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">1. Be specific about what you repair</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Buyers aren’t searching for “great service.” They’re searching for <em>AC/DC</em>, <em>medium voltage</em>, <em>pump motors</em>, <em>explosion-proof</em>, <em>inverter-duty</em>, or <em>emergency field service</em>. Your website and directory profile should mirror that vocabulary. Specificity builds trust and filters out bad-fit calls.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">2. Win on speed to first response</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            When a line is down, the first shop that answers with a clear next step gets the motor. Use scripted intake: asset data, failure mode, required date, shipping/pickup. Even if you can’t quote instantly, acknowledge receipt and set expectations. Speed beats polish when plants are bleeding throughput.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">3. Publish proof: certs, tests, photos</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            EASA AR100 adherence, ISO programs, vibration/balance reports—whatever you actually do, make it visible (without dumping a 40-page PDF). Photos of your shop floor and test panel signal legitimacy to buyers who’ve been burned by brokers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">4. Tie marketing to operations</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Leads die when the handoff is messy. A single workspace for quotes and job cards means sales isn’t retyping what the customer already said. Read{" "}
            <Link href="/motor-repair-shop-management-software" className="text-primary font-medium hover:underline">
              motor repair shop management software
            </Link>{" "}
            and{" "}
            <Link href="/track-motor-repair-jobs" className="text-primary font-medium hover:underline">
              track motor repair jobs
            </Link>{" "}
            for the operational side of growth.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">5. Measure what matters</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Track lead source, quote-to-win rate, and average job age by stage. If you only measure top-line revenue, you’ll confuse busy-ness with profitability. Tighten the stages that age the longest—often parts delays or unclear approvals.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">Next steps</h2>
          <ul className="mt-4 space-y-2 text-secondary">
            <li>
              <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
                USA motor repair business listing hub
              </Link>
            </li>
            <li>
              <Link href="/blog/motor-rewinding-business-marketing-usa" className="text-primary font-medium hover:underline">
                Motor rewinding business marketing in the USA
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </BlogPageLayout>
  );
}
