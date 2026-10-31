import Link from "next/link";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import HeroBackground from "@/components/marketing/HeroBackground";
import DemoBookingLink from "@/components/marketing/demo-booking-link";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const site = getPublicSiteUrl().replace(/\/$/, "");

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About 3PhaseFlow",
  url: `${site}/about`,
  mainEntity: {
    "@type": "Organization",
    name: "3PhaseFlow",
    url: site,
    foundingDate: "2025",
    description:
      "3PhaseFlow is a shop management platform and public directory built " +
      "exclusively for electric motor repair and rewinding businesses in the " +
      "United States. The platform manages work orders, customer and motor " +
      "history, inventory, invoicing, and leads. The public directory lists " +
      "certified repair centers by state, connecting industrial buyers with " +
      "local motor repair shops.",
    areaServed: "United States",
    knowsAbout: [
      "Electric motor repair",
      "Motor rewinding",
      "Shop management software",
      "Motor repair cost estimation",
      "EASA AR100 standards",
      "Lead generation for motor repair shops",
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-12 sm:py-16">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]"
          aria-hidden
        />
        <HeroBackground />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: "Home", url: "/" },
              { name: "About", url: "/about" },
            ]}
          />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">About 3PhaseFlow</h1>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <section aria-labelledby="story-heading" className="mb-12">
          <h2 id="story-heading" className="text-xl font-bold text-title sm:text-2xl">
            How 3PhaseFlow started
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            3PhaseFlow started with one motor repair shop running entirely on paper, job cards everywhere, winding
            data written on travelers that got lost, work orders tracked on a whiteboard, and invoices going out late
            because nobody could find the completed job sheet.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            The founding team built a database in Microsoft Excel and Access to manage that shop&apos;s jobs, work
            orders, billing, and motor history. After several months of refinement and real-world use, the system worked.
            The question became: how many other motor repair shops are running the same way?
          </p>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            The answer was almost all of them. 3PhaseFlow launched in 2025 to bring purpose-built shop management
            software to the electric motor repair industry, an industry that had never had software designed
            specifically for its workflow.
          </p>
        </section>

        <section aria-labelledby="what-heading" className="mb-12">
          <h2 id="what-heading" className="text-xl font-bold text-title sm:text-2xl">
            What 3PhaseFlow is
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            3PhaseFlow is two things operating as one platform:
          </p>
          <dl className="about-two-sides">
            <div>
              <dt>Shop management software</dt>
              <dd>
                A purpose-built CRM and operations platform for electric motor repair shops. Features include the Simple
                dashboard (installable on phone and tablet as a PWA) with service proposals, Master Data Search, and job
                purchase orders; digital job write-ups with full motor nameplate data (HP, voltage, RPM, frame,
                enclosure, insulation class, winding specifications); work order tracking from intake through testing to
                delivery; customer and motor history registry; shop parts inventory with job reservations; invoicing;
                accounts receivable; vendor purchase orders; accounts payable; QuickBooks Online sync; API access; and a
                technician mobile app for floor status and testing. Pricing starts at $349 per month for unlimited
                users.
              </dd>
            </div>
            <div>
              <dt>Lead generation directory</dt>
              <dd>
                A public directory of certified electric motor repair centers across the United States, indexed on
                Google and optimized for local motor repair searches. Industrial buyers searching for AC motor
                rewinding, DC armature repair, high-voltage motor service, servo motor repair, pump repair, and
                generator rewinding can find and contact listed shops directly. Shop listings include capabilities,
                certifications, service area, HP range, turnaround time, and emergency availability.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="who-heading" className="mb-12">
          <h2 id="who-heading" className="text-xl font-bold text-title sm:text-2xl">
            Who 3PhaseFlow serves
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">3PhaseFlow serves two audiences:</p>
          <ul className="about-audiences">
            <li>
              <strong className="text-title">Motor repair shop owners and operators</strong> who need a system to manage
              jobs, customers, inventory, and billing, and who want to generate leads from industrial buyers searching
              online for repair services in their area.
            </li>
            <li>
              <strong className="text-title">Industrial buyers</strong>, maintenance managers, plant engineers,
              procurement managers, and operations directors, who need to find a certified motor repair or rewinding
              shop near their facility for AC motors, DC motors, high-voltage motors, servo motors, pumps, and
              generators.
            </li>
          </ul>
        </section>

        <section aria-labelledby="standards-heading" className="mb-12">
          <h2 id="standards-heading" className="text-xl font-bold text-title sm:text-2xl">
            Industry standards 3PhaseFlow references
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            Content and shop matching on 3PhaseFlow references the following industry standards:
          </p>
          <ul className="about-standards">
            <li>
              <strong className="text-title">EASA AR100</strong>, recommended Practice for the Repair of Rotating
              Electrical Apparatus, published by the Electrical Apparatus Service Association. The primary standard for
              motor rewinding quality and efficiency preservation.
            </li>
            <li>
              <strong className="text-title">NEMA MG-1</strong>, Motors and Generators standard published by the National
              Electrical Manufacturers Association. Governs motor design, performance, and testing in North America.
            </li>
            <li>
              <strong className="text-title">IEEE 43</strong>, recommended Practice for Testing Insulation Resistance of
              Rotating Machinery.
            </li>
            <li>
              <strong className="text-title">IEEE 95</strong>, recommended Practice for Insulation Testing of AC Electric
              Machinery using High Voltage at Very Low Frequency.
            </li>
            <li>
              <strong className="text-title">EISA 2007</strong>, Energy Independence and Security Act, which mandated NEMA
              Premium Efficiency standards for general-purpose motors 1 to 500 HP sold in the United States.
            </li>
          </ul>
        </section>

        <section aria-labelledby="contact-about-heading" className="mb-12">
          <h2 id="contact-about-heading" className="text-xl font-bold text-title sm:text-2xl">
            Contact 3PhaseFlow
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            For shop owners interested in listing or the platform:{" "}
            <DemoBookingLink className="font-medium text-primary hover:underline">
              Book a free demo
            </DemoBookingLink>
            {" or "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
          <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
            For industrial buyers looking for motor repair:{" "}
            <Link href="/electric-motor-repair-near-me" className="font-medium text-primary hover:underline">
              Find motor repair shops near you
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="related-about-heading">
          <h2 id="related-about-heading" className="text-xl font-bold text-title sm:text-2xl">
            Learn more
          </h2>
          <ul className="about-related-links">
            <li>
              <Link href="/motor-repair-shop-management-software" className="text-primary hover:underline">
                Motor repair shop management software
              </Link>
            </li>
            <li>
              <Link href="/electric-motor-repair-near-me" className="text-primary hover:underline">
                Find electric motor repair shops near me
              </Link>
            </li>
            <li>
              <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary hover:underline">
                Motor repair and rewinding cost guide
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="text-primary hover:underline">
                3PhaseFlow pricing
              </Link>
            </li>
            <li>
              <Link href="/electric-motor-repair-shops-listings" className="text-primary hover:underline">
                Browse all repair centers
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
