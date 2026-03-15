import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import GetQuoteCta from "@/components/marketing/GetQuoteCta";

const path = "/how-to-choose-electric-motor-repair-shop";

export const metadata = {
  title: "How to Choose an Electric Motor Repair Shop | Buyer's Guide",
  description:
    "What to look for when choosing an electric motor repair or rewinding shop: capabilities, certifications, turnaround, and how to get and compare quotes.",
  keywords: [
    "choose motor repair shop",
    "electric motor repair shop",
    "motor rewinding shop selection",
    "industrial motor repair buyer guide",
    "motor repair certifications",
    "find qualified motor repair",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "How to Choose an Electric Motor Repair Shop | MotorsWinding.com",
    description:
      "A practical guide to selecting a qualified motor repair and rewinding shop for your equipment.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Choose an Electric Motor Repair Shop | MotorsWinding.com",
    description: "A practical guide to selecting a qualified motor repair and rewinding shop.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function HowToChooseElectricMotorRepairShopPage() {
  return (
    <BlogPageLayout
      title="How to choose an electric motor repair shop"
      description="When a motor fails or needs a rewind, choosing the right shop affects cost, downtime, and long-term reliability. Here’s what to look for and how to compare repair centers."
      breadcrumbLink={{ href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" }}
      canonicalPath={path}
      sidebarTitle="Get a quote or find a shop"
      sidebarDescription="Submit your motor details and we’ll connect you with repair centers that can quote your job. Or browse our directory by location."
      sidebarCta={<GetQuoteCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Match the shop to your motor and application
          </h2>
          <p className="mt-4 text-secondary">
            Not every shop handles every type of motor. Check whether they work on your voltage (low, medium, high), motor type (AC, DC, servo, pump, etc.), and size (HP and frame). Specialty work—explosion-proof, hazardous location, submersible, or OEM-authorized repair—may require a shop with specific experience and certifications. Confirm capabilities before sending the motor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Look for clear scope and testing
          </h2>
          <p className="mt-4 text-secondary">
            A good shop will inspect the motor, provide a written quote (repair vs. rewind, parts, labor, testing), and explain what’s included. Ask about testing: megger, surge, vibration, balancing, load testing. Post-repair testing helps ensure the motor is fit for service before it leaves the shop. Avoid shops that give vague estimates or skip testing on critical equipment.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Certifications and quality systems
          </h2>
          <p className="mt-4 text-secondary">
            EASA membership, ISO certification, UL certification, and factory-authorized repair status indicate that the shop follows documented processes and quality standards. For mission-critical or regulated applications, these matter. They’re not a guarantee of a perfect job, but they signal a structured approach to repair and rewinding.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Turnaround and communication
          </h2>
          <p className="mt-4 text-secondary">
            Downtime costs money. Ask about typical turnaround for your type and size of motor, and whether they offer rush or emergency service (often at a premium). Clear communication—when the motor arrived, inspection results, quote, and completion date—reduces surprises. Choose a shop that responds promptly and keeps you updated.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Get more than one quote
          </h2>
          <p className="mt-4 text-secondary">
            Comparing two or three quotes helps you balance price, turnaround, and scope. Make sure quotes are for the same work (e.g., full rewind, same testing) so you’re comparing apples to apples. The lowest price isn’t always the best value if quality or turnaround doesn’t meet your needs.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Find and compare repair shops
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/electric-motor-reapir-shops-listings" className="text-primary font-medium hover:underline">
              Browse our directory of electric motor repair centers
            </Link>{" "}
            by location and service type, or{" "}
            <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
              read about typical repair and rewinding costs
            </Link>{" "}
            to prepare for quotes.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
