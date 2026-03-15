import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import GetQuoteCta from "@/components/marketing/GetQuoteCta";

const path = "/types-of-electric-motor-repair-services";

export const metadata = {
  title: "Types of Electric Motor Repair Services | Repair vs Rewind | MotorsWinding.com",
  description:
    "Overview of electric motor repair and rewinding services: bearing replacement, rewind, testing, VFD and pump repair. Find the right shop for your motor type.",
  keywords: [
    "electric motor repair services",
    "motor rewind services",
    "types of motor repair",
    "AC DC motor repair",
    "motor bearing replacement",
    "industrial motor rewinding",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Types of Electric Motor Repair Services | MotorsWinding.com",
    description:
      "Understand the main types of motor repair and rewinding services and how to find a qualified shop.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Types of Electric Motor Repair Services | MotorsWinding.com",
    description: "Overview of motor repair and rewinding services and how to find a qualified shop.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function TypesOfElectricMotorRepairServicesPage() {
  return (
    <BlogPageLayout
      title="Types of electric motor repair services"
      description="Electric motor repair covers a wide range of work—from bearing changes and cleaning to full rewinds and specialty testing. Knowing the main service types helps you describe your need and choose the right shop."
      breadcrumbLink={{ href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" }}
      canonicalPath={path}
      sidebarTitle="Get a quote or find a shop"
      sidebarDescription="Tell us about your motor and we’ll connect you with repair centers that can quote your job. Or browse our directory."
      sidebarCta={<GetQuoteCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Repair vs. rewind: what’s the difference?
          </h2>
          <p className="mt-4 text-secondary">
            <strong className="text-title">Repair</strong> usually means fixing the motor without replacing the windings—e.g., bearing replacement, seal replacement, cleaning, balancing, or fixing connections. <strong className="text-title">Rewind</strong> means removing the old windings and installing new ones, often with new insulation and varnish. Rewinds are done when the windings are burned, damaged, or degraded. Shops will inspect the motor and recommend repair or rewind based on condition.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            AC and DC motor repair and rewinding
          </h2>
          <p className="mt-4 text-secondary">
            Most shops handle AC induction motors (single- and three-phase) and many handle DC motors (armature and field rewinding). Capabilities vary: some specialize in small fractional-HP motors; others focus on large industrial AC/DC. When searching for a shop, confirm they work on your motor type and size (HP, voltage, frame).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Specialty motors: pump, servo, spindle, VFD
          </h2>
          <p className="mt-4 text-secondary">
            Pump motors, servo motors, spindle motors, and motors driven by VFDs may need shops with specific experience. Pump and submersible motors often involve seals and mechanical work in addition to electrical. Servo and spindle motors may require OEM or authorized repair. VFD-driven motors can have insulation issues that need appropriate repair practices. Ask the shop if they regularly work on your motor type.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Testing and inspection
          </h2>
          <p className="mt-4 text-secondary">
            Good shops offer testing before and after repair: megger (insulation resistance), surge testing, vibration analysis, balancing, and load testing. Testing confirms the motor is fit for service and can catch problems before they cause another failure. For critical applications, insist on a clear testing scope in the quote.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Field service and emergency repair
          </h2>
          <p className="mt-4 text-secondary">
            Some shops offer on-site troubleshooting, bearing replacement, or emergency call-out. That can reduce downtime when the motor can’t be easily removed or when you need a quick diagnosis. Not every shop offers field service—check the directory or ask when requesting a quote.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Find a shop for your motor type
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/electric-motor-reapir-shops-listings" className="text-primary font-medium hover:underline">
              Browse our directory of electric motor repair centers
            </Link>{" "}
            to see services, capabilities, and locations. You can filter by service type and region, or{" "}
            <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
              read about typical costs
            </Link>{" "}
            to prepare for getting quotes.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
