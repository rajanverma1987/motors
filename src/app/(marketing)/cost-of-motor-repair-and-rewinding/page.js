import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import CostPageCta from "./cost-page-cta";

const path = "/cost-of-motor-repair-and-rewinding";

export const metadata = {
  title: "Cost of Motor Repair and Rewinding | What to Expect",
  description:
    "Understand what drives the cost of electric motor repair and rewinding. Factors, typical price ranges, and how to get an accurate quote from a repair center.",
  keywords: [
    "motor repair cost",
    "motor rewinding cost",
    "electric motor repair price",
    "motor rewind quote",
    "industrial motor repair cost",
    "how much does motor repair cost",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Cost of Motor Repair and Rewinding | MotorsWinding.com",
    description:
      "What affects the cost of motor repair and rewinding? Learn the factors and how to get a quote from qualified repair centers.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cost of Motor Repair and Rewinding | MotorsWinding.com",
    description: "What drives the cost of motor repair and rewinding and how to get a quote.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function CostOfMotorRepairPage() {
  return (
    <BlogPageLayout
      title="Cost of motor repair and rewinding"
      description="Electric motor repair and rewinding costs depend on motor size, type of work, and condition. This guide covers what typically drives the price and how to get an accurate quote from a qualified center."
      breadcrumbLink={{ href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" }}
      canonicalPath={path}
      sidebarTitle="Get a quote"
      sidebarDescription="Submit your requirement. We'll connect you with repair centers that can quote your job."
      sidebarCta={<CostPageCta />}
    >
      <section>
        <h2 className="text-2xl font-bold text-title sm:text-3xl">
          What affects the cost of motor repair and rewinding?
        </h2>
        <p className="mt-4 text-secondary">
          No two jobs are identical. Repair centers base quotes on several factors. Understanding these helps you compare estimates and plan budgets.
        </p>

        <ul className="mt-8 space-y-6">
          <li>
            <h3 className="text-lg font-semibold text-title">Motor size and horsepower (HP)</h3>
            <p className="mt-2 text-secondary">
              Larger motors use more copper, insulation, and labor. A small fractional-HP motor may cost a few hundred dollars to rewind;
              large industrial motors (e.g. 500 HP and up) can run into the thousands. Horsepower and frame size are the biggest cost drivers.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">Type of work: repair vs. rewind</h3>
            <p className="mt-2 text-secondary">
              Minor repairs—bearing replacement, cleaning, balancing, or simple electrical fixes—are usually less expensive than a full rewind.
              A rewind replaces the windings and often requires stripping, rewinding, varnishing, and testing, so labor and materials are higher.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">Condition and damage</h3>
            <p className="mt-2 text-secondary">
              Burned windings, mechanical damage, or contamination can increase labor and parts. Shaft work, bearing fits, or frame repairs add cost.
              Shops often quote after inspection so they can account for hidden damage.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">Voltage and motor type</h3>
            <p className="mt-2 text-secondary">
              High-voltage and specialty motors (e.g. explosion-proof, washdown, or custom designs) may need different materials and procedures,
              which can affect price. Single-phase vs. three-phase and AC vs. DC also influence labor and parts.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">Labor, parts, and testing</h3>
            <p className="mt-2 text-secondary">
              Labor rates vary by region and shop. Replacement parts (bearings, seals, etc.) and testing (megger, surge, load testing) are often
              itemized. Rush or emergency service may carry a premium.
            </p>
          </li>
        </ul>
      </section>

      <section className="mt-12 border-t border-border pt-12">
        <h2 className="text-2xl font-bold text-title sm:text-3xl">
          Typical price ranges (ballpark only)
        </h2>
        <p className="mt-4 text-secondary">
          Exact costs depend on your motor and the shop. These ranges are for general reference only; always get a written quote.
        </p>
        <ul className="mt-6 space-y-3 text-secondary">
          <li><strong className="text-title">Small motors (fractional to ~5 HP):</strong> Repairs and rewinds often in the low hundreds to around $1,000+ depending on rewind vs. repair.</li>
          <li><strong className="text-title">Medium motors (~5–50 HP):</strong> Rewinds and repairs commonly range from roughly $1,000 to several thousand dollars.</li>
          <li><strong className="text-title">Large industrial motors (50 HP and up):</strong> Costs can range from several thousand to tens of thousands, especially for full rewinds and major repairs.</li>
        </ul>
        <p className="mt-6 text-secondary">
          Many shops offer free or low-cost inspection and quote. Getting two or three quotes from approved repair centers helps you compare and choose.
        </p>
      </section>

      <section className="mt-12 border-t border-border pt-12">
        <h2 className="text-2xl font-bold text-title sm:text-3xl">
          When to get a quote
        </h2>
        <p className="mt-4 text-secondary">
          If a motor is failing, tripping, noisy, or underperforming, have it inspected before it fails completely. Early repair is often cheaper than a full burnout rewind.
          For critical equipment, consider standby or spare motors and planned maintenance to avoid emergency premiums.
        </p>
        <p className="mt-6 text-sm text-secondary">
          <Link href="/electric-motor-reapir-shops-listings" className="text-primary hover:underline">Browse repair centers by location</Link> and contact them directly.
        </p>
      </section>
    </BlogPageLayout>
  );
}
