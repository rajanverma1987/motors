import Link from "next/link";
import Button from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">About IQMotorBase</h1>
        <p className="mt-6 text-lg leading-relaxed text-secondary">
          IQMotorBase was built for electric motor repair and rewinding shops that are tired of juggling
          spreadsheets, paper job cards, and disconnected apps. We bring intake, inspections, quotes, work
          orders, inventory, invoicing, and repair leads into one platform so your office and shop floor stay
          aligned on the same job number.
        </p>
        <p className="mt-4 leading-relaxed text-secondary">
          Our directory and local SEO pages help customers find qualified repair centers, while shops on the
          platform can capture leads, list surplus parts on the marketplace, and hire technicians through
          public Careers postings. Whether you run a single bay or multiple locations, the goal is the same:
          less re-entry, clearer status, and a single source of truth from first call through payment.
        </p>
        <p className="mt-4 leading-relaxed text-secondary">
          We are focused on the workflows repair shops actually use every day — not generic field-service
          software adapted after the fact. That means motor-specific records, Tag QR scanning for technicians,
          vendor POs and shop inventory, and RFQs that stay tied to the job from write-up through delivery.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/contact">
            <Button variant="primary" size="md">
              Book a demo
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="md">
              Explore features
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
