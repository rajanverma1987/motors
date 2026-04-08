import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/blog/motor-rewinding-cm-best-match-calculator-guide";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is circular mil (CM) in electric motor rewinding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Circular mils (CM) measure the cross-sectional area of round conductor. In rewinding, total CM describes how much copper area carries current in a slot or parallel path. Shops compare original winding CM to a target CM when redesigning turns, parallel wires, or substituting magnet wire sizes from inventory.",
      },
    },
    {
      "@type": "Question",
      name: "What does the CM Best Match calculator do in MotorsWinding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It searches combinations of up to three wire sizes and quantities from your shop’s selectable wire catalog to approximate a targeted total CM. Results are ranked by how close the combination is to the target, with color bands for tight (~2%) and moderate (~10%) matches. It supports printing for the bench.",
      },
    },
    {
      "@type": "Question",
      name: "Why connect CM Best Match to a shop wire catalog?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rewind shops rarely stock every theoretical AWG; they stock what vendors deliver and what fits their varnish systems. Matching against real on-hand sizes reduces scrap, purchase orders, and guesswork when you cannot duplicate the exact original build.",
      },
    },
    {
      "@type": "Question",
      name: "Is CM Best Match a replacement for engineering sign-off?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. It is a planning and estimation aid. Final slot fill, temperature rise, insulation class, voltage stress, and code or customer specifications still require qualified engineering judgment, pull tests, and adherence to applicable standards.",
      },
    },
    {
      "@type": "Question",
      name: "Where do I open CM Best Match in the dashboard?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sign in to your MotorsWinding CRM, go to Dashboard → Calculators, and open the CM Best Match tab (default tab). The same calculator logic aligns with common motor-shop bench workflows.",
      },
    },
  ],
};

export const metadata = {
  title: "CM Best Match Calculator for Motor Rewinding (Guide for Repair Shops)",
  description:
    "How circular mils (CM) work in rewinds, what the MotorsWinding CM Best Match tool does, how it uses your wire catalog, and when rewind shops need it on the bench.",
  keywords: [
    "circular mils calculator",
    "motor rewinding wire size",
    "CM best match",
    "magnet wire parallel",
    "electric motor rewind calculator",
    "wire catalog motor shop",
  ],
  openGraph: {
    title: "CM Best Match Calculator for Motor Rewinding | MotorsWinding.com",
    description:
      "Circular mils, targeted CM, and shop-wire combinations—explained for rewind technicians and shop owners.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CM Best Match Calculator for Motor Rewinding",
    description: "How CM matching works and why rewind shops use it with a real wire catalog.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogCmBestMatchGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogPageLayout
        title="CM Best Match calculator for motor rewinding: what it is and how it works"
        description="Circular mils (CM) drive slot fill and ampacity in rewinds. This guide explains the MotorsWinding CM Best Match tool—catalog-backed combinations, match bands, and where it fits between takeoff data and final engineering review."
        breadcrumbLink={{ href: "/blog", label: "Blog" }}
        canonicalPath={path}
        sidebarTitle="Calculators in your CRM"
        sidebarDescription="CM Best Match plus power, speed, torque, and bench tools—same place your jobs and quotes live."
        sidebarCta={<ListYourShopCta />}
      >
        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="lead text-lg text-secondary leading-relaxed">
            If you rewind industrial or commercial motors, you constantly translate between <strong className="text-title">original winding data</strong>,{" "}
            <strong className="text-title">target circular mils</strong>, and{" "}
            <strong className="text-title">what is actually on your shelf</strong>. The{" "}
            <Link href="/dashboard/calculators" className="font-medium text-primary hover:underline">
              MotorsWinding dashboard calculators
            </Link>{" "}
            include <strong className="text-title">CM Best Match</strong> so the computer does the combinatorial search while you keep engineering judgment.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">What “CM” means on the rewind bench</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Circular mils (CM)</strong> describe conductor cross-sectional area for round wire. In practice, rewinders care about{" "}
              <em>total CM per path</em>—parallel strands, hand bundles, and slot geometry all interact. When you change turns, voltage, or parallel count, you often need a{" "}
              <strong className="text-title">new target CM</strong> that still respects ampacity and fill while using wire you can buy or strip from core.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Search engines and AI assistants often surface questions like “how to match magnet wire sizes for a motor rewind”—the underlying need is the same:{" "}
              <strong className="text-title">find a practical combination of real wire sizes</strong> that lands close to a target CM, not a textbook single-AWG fantasy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">How CM Best Match works (in plain language)</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              You enter your <strong className="text-title">original wires in hand</strong>, <strong className="text-title">original wire size</strong>, and the tool derives context such as original CM. You set a <strong className="text-title">target CM</strong> and bounds on how many parallel wires you will consider. You then <strong className="text-title">select which catalog wire sizes</strong> the search is allowed to use—mirroring what your shop actually stocks or will order.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The engine evaluates combinations (up to three size slots in the results table) and reports <strong className="text-title">total CM</strong>, difference from target, and percent difference. Rows highlighted <strong className="text-title">green</strong> are within about <strong className="text-title">2%</strong> of the target; <strong className="text-title">yellow</strong> within about <strong className="text-title">10%</strong>—useful for quick triage before you commit to a build.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              You can <strong className="text-title">print</strong> the results for the shop floor; the layout is tuned for landscape print preview so technicians see variables plus the full table away from the screen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Where motor rewind shops need CM Best Match</h2>
            <ul className="mt-4 list-none space-y-3 text-secondary">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Emergency rewinds</strong> when you must substitute sizes from stock and still hit ampacity and slot constraints.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Voltage or connection changes</strong> (e.g. re-rate scenarios) where turns and parallel wires shift the CM target.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Training junior winders</strong>—shows how small changes in parallel counts move total CM without hand spreadsheets.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Quoting discussions</strong> when you need a fast, defensible “what we can build from inventory” story before engineering locks the traveler.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">What CM Best Match is not</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              It does not replace <strong className="text-title">NEC / local electrical code</strong>, <strong className="text-title">nameplate FLA</strong>, <strong className="text-title">thermal class</strong>, or <strong className="text-title">customer specifications</strong>. It does not perform finite-element thermal analysis. Always verify with pull tests, engineering review, and field measurements where required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Related tools in the same calculator suite</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              After CM planning, shops often jump to <strong className="text-title">HP ↔ kW</strong>, <strong className="text-title">estimated FLA</strong>, <strong className="text-title">synchronous speed</strong>, and <strong className="text-title">torque</strong> for discussions with customers and field techs. See the companion guide:{" "}
              <Link href="/blog/electric-motor-calculators-fla-torque-speed-power" className="font-medium text-primary hover:underline">
                Electric motor calculators: FLA, torque, speed &amp; bench electrical
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Frequently asked questions</h2>
            <div className="mt-6 space-y-6 text-secondary">
              <div>
                <h3 className="text-lg font-semibold text-title">What is circular mil (CM) in electric motor rewinding?</h3>
                <p className="mt-2 leading-relaxed">
                  Circular mils measure round wire cross-sectional area. Rewinders use total CM to describe how much copper area carries current for a path, especially when paralleling strands.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">What does the CM Best Match calculator do?</h3>
                <p className="mt-2 leading-relaxed">
                  It searches combinations from your selected shop wire catalog to approximate a target CM, ranks closeness, and supports printing for the bench.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Why wire a catalog into the search?</h3>
                <p className="mt-2 leading-relaxed">
                  Real shops stock real sizes. Catalog-backed matching reduces ordering delays and impossible theoretical AWGs.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Is this a substitute for engineering sign-off?</h3>
                <p className="mt-2 leading-relaxed">
                  No—use it for estimation and planning; validate slot fill, temperature rise, and standards with qualified review.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Where is the calculator in the app?</h3>
                <p className="mt-2 leading-relaxed">
                  Dashboard → <Link href="/dashboard/calculators" className="font-medium text-primary hover:underline">Calculators</Link> → CM Best Match tab.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="text-xl font-bold text-title sm:text-2xl">Related reading &amp; listings</h2>
            <ul className="mt-4 space-y-2 text-secondary">
              <li>
                <Link href="/blog/electric-motor-calculators-fla-torque-speed-power" className="font-medium text-primary hover:underline">
                  Electric motor calculators: FLA, torque, speed &amp; bench electrical
                </Link>
              </li>
              <li>
                <Link href="/motor-repair-shop-management-software" className="font-medium text-primary hover:underline">
                  Motor repair shop management software
                </Link>
              </li>
              <li>
                <Link href={SEO_USA_HUB_PATH} className="font-medium text-primary hover:underline">
                  USA motor repair business listing
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
