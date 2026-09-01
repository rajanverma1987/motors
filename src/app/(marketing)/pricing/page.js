import Breadcrumbs from "@/components/seo/breadcrumbs";
import HeroBackground from "@/components/marketing/HeroBackground";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import PricingCardsClient from "./pricing-cards-client";
import PricingContactFaqClient from "./pricing-contact-faq-client";

export const metadata = marketingPageMetadata({
  path: "/pricing",
  title: "Pricing | Motor Repair Shop Software | IQMotorBase",
  description:
    "IQMotorBase shop management software starts at $349/month. " +
    "Work orders, leads, inventory, invoicing, and QuickBooks sync, " +
    "built exclusively for electric motor repair shops. " +
    "10 founder spots available at a permanently locked rate.",
  ogTitle: "Pricing | Motor Repair Shop Software | IQMotorBase",
  ogDescription:
    "IQMotorBase starts at $349/month. Built exclusively for electric " +
    "motor repair shops. 10 founder spots available.",
});

const site = getPublicSiteUrl().replace(/\/$/, "");

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "IQMotorBase",
  url: site,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Shop management software built exclusively for electric motor repair " +
    "and rewinding businesses. Work orders, lead generation, inventory, " +
    "invoicing, accounts receivable, vendor POs, QuickBooks Online sync, " +
    "and technician mobile app.",
  offers: [
    {
      "@type": "Offer",
      name: "Monthly Plan",
      price: "349.00",
      priceCurrency: "USD",
      billingIncrement: "P1M",
      description:
        "Full platform access billed monthly. Work orders, leads, " +
        "inventory, invoicing, QuickBooks sync. Cancel anytime.",
    },
    {
      "@type": "Offer",
      name: "Annual Plan",
      price: "3235.00",
      priceCurrency: "USD",
      billingIncrement: "P1Y",
      description:
        "Full platform access billed annually. Save $983/year vs monthly. " +
        "Equivalent to $269/month.",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does IQMotorBase cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "IQMotorBase costs $349/month on the monthly plan or $3,235/year " +
          "on the annual plan (equivalent to $269/month, saving $983/year). " +
          "Both plans include unlimited users and full platform access, " +
          "work orders, lead generation, inventory, invoicing, accounts " +
          "receivable, vendor POs, and QuickBooks Online sync.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in IQMotorBase pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "All plans include: digital job write-ups with motor nameplate data, " +
          "work order tracking, customer and motor history registry, shop " +
          "inventory management, invoicing and accounts receivable, vendor " +
          "purchase orders, QuickBooks Online sync, lead generation from the " +
          "IQMotorBase directory, marketplace listings, careers/job board, " +
          "and API access. Technician mobile app coming soon.",
      },
    },
    {
      "@type": "Question",
      name: "Does IQMotorBase offer a free trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "IQMotorBase offers a free demo rather than a self-serve trial. " +
          "Book a 20-minute demo to see the full platform and get your " +
          "questions answered before committing.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a discount for annual billing?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. The annual plan costs $3,235/year, equivalent to $269/month, " +
          "saving $983 compared to 12 months of monthly billing. " +
          "Founder pricing is also available for the first 10 shops, " +
          "contact us for details.",
      },
    },
    {
      "@type": "Question",
      name: "What is IQMotorBase founder pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "IQMotorBase is offering a permanently locked discounted rate to " +
          "the first 10 shops that join the platform. Founder pricing is " +
          "locked for life. Your rate never increases as long as you stay " +
          "subscribed. Contact us to check if founder spots are still available.",
      },
    },
    {
      "@type": "Question",
      name: "How many users are included?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Both plans include unlimited users. Add as many technicians, " +
          "service writers, managers, and office staff as your shop needs " +
          "at no extra charge.",
      },
    },
  ],
};

const INCLUDED_FEATURES = [
  {
    title: "Digital job write-ups",
    description:
      "Create job write-ups with full motor nameplate data: HP, voltage, RPM, frame, enclosure, insulation class, winding data. Every job starts with a complete motor record, not a blank form.",
  },
  {
    title: "Work order management",
    description:
      "Track every job from intake through testing to delivery. Status updates, technician assignments, QR code scanning, and job history, all in one view.",
  },
  {
    title: "Customer and motor registry",
    description:
      "Every customer's motors on file. Full repair history, nameplate data, previous job details, instantly available when a motor comes back in. No re-entering data that's already in the system.",
  },
  {
    title: "Shop inventory management",
    description:
      "Track parts, wire, and consumables. Reserve inventory to jobs. Get low-stock alerts before you run out of something critical mid-rewind.",
  },
  {
    title: "Invoicing and accounts receivable",
    description:
      "Generate invoices directly from completed work orders. Track payments, send reminders, and manage AR, without switching to a separate accounting tool.",
  },
  {
    title: "Vendor POs and accounts payable",
    description:
      "Create and track purchase orders to suppliers. Manage what you owe and when it's due, all connected to your job costs.",
  },
  {
    title: "QuickBooks Online sync",
    description:
      "Invoices and payments sync to QuickBooks Online automatically. No double entry. Your accountant gets accurate books without you manually exporting anything.",
  },
  {
    title: "Lead generation directory",
    description:
      "Your shop is listed in the IQMotorBase public directory, indexed on Google, reaching industrial buyers searching for motor repair in your area. Leads land in your dashboard.",
  },
  {
    title: "Marketplace and careers board",
    description:
      "List surplus parts and equipment on the IQMotorBase marketplace. Post open technician and winder positions on the careers board, reaching the right candidates in the motor repair trade.",
  },
  {
    title: "Unlimited users",
    description:
      "Add every technician, service writer, and manager at no extra cost. Role-based access controls what each user can see and do.",
  },
  {
    title: "Technician mobile app",
    description:
      "Coming soon. Technicians will be able to scan job QR codes, update work order status, and log motor testing data from the shop floor, without going back to a desk.",
  },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-12 sm:py-16">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]"
          aria-hidden
        />
        <HeroBackground />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: "Home", url: "/" },
              { name: "Pricing", url: "/pricing" },
            ]}
          />
          <h1 className="text-balance text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
            One platform. Unlimited users. Everything your motor repair shop needs to manage jobs, leads,
            inventory, and billing, built for this industry, not adapted from auto repair software.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <PricingCardsClient />

          <section aria-labelledby="included-heading" className="mb-12">
            <h2 id="included-heading" className="text-xl font-bold text-title sm:text-2xl">
              Everything included in every plan
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary sm:text-base">
              No add-ons. No per-user fees. No surprise charges. Every plan includes the full IQMotorBase
              platform:
            </p>
            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {INCLUDED_FEATURES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
                >
                  <dt className="font-semibold text-title">{item.title}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-secondary">{item.description}</dd>
                </div>
              ))}
            </dl>
          </section>

          <PricingContactFaqClient />
        </div>
      </section>
    </>
  );
}
