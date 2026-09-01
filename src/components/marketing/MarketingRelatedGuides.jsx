import Link from "next/link";

const BUYER_LINKS = [
  {
    href: "/industrial-motor-repair",
    label: "Industrial motor repair",
    hint: "Plant motors, rewinding, costs & shops",
  },
  {
    href: "/cost-of-motor-repair-and-rewinding",
    label: "Motor repair & rewinding costs",
    hint: "Price factors and US ballpark ranges",
  },
  {
    href: "/how-to-choose-electric-motor-repair-shop",
    label: "How to choose a repair shop",
    hint: "Capabilities, testing, certifications",
  },
  {
    href: "/when-to-repair-or-replace-electric-motor",
    label: "Repair vs. replace a motor",
    hint: "Economics, downtime, efficiency",
  },
  {
    href: "/types-of-electric-motor-repair-services",
    label: "Types of repair services",
    hint: "Rewind, bearings, testing, field service",
  },
  {
    href: "/emergency-motor-repair-what-to-do",
    label: "Emergency motor failure",
    hint: "Rush repair and what to do first",
  },
  {
    href: "/electric-motor-repair",
    label: "Electric motor repair hub",
    hint: "All buyer guides in one place",
  },
  {
    href: "/electric-motor-repair-shops-listings",
    label: "Find repair shops",
    hint: "Directory by location",
  },
  {
    href: "/electric-motor-repair-near-me",
    label: "Repair shops near me",
    hint: "Local search intent",
  },
  {
    href: "/marketplace",
    label: "Parts & equipment marketplace",
    hint: "Surplus motors and parts",
  },
  {
    href: "/contact",
    label: "Request a quote",
    hint: "We connect you with shops",
  },
];

const SHOP_LINKS = [
  {
    href: "/motor-repair-shop-management-software",
    label: "Shop management software",
    hint: "Work orders, job board, inventory",
  },
  {
    href: "/motor-repair-crm-software",
    label: "Motor repair shop management system & leads",
    hint: "Customer/motor registry + directory leads",
  },
  {
    href: "/work-order-software-for-motor-repair-shops",
    label: "Work order software",
    hint: "Job-linked WOs, board, Tag QR",
  },
  {
    href: "/motor-repair-inventory-software",
    label: "Inventory software",
    hint: "On-hand, reserved, ship consumption",
  },
  {
    href: "/motor-repair-invoicing-and-quoting-software",
    label: "Invoicing & quoting",
    hint: "RFQs to invoices and AR",
  },
  {
    href: "/blog/best-software-for-repair-shop-2026",
    label: "Best software comparison (2026)",
    hint: "IQMotorBase vs other options",
  },
  {
    href: "/track-motor-repair-jobs",
    label: "Track repair jobs",
    hint: "Visibility from quote to delivery",
  },
  {
    href: "/job-card-system-for-repair-shop",
    label: "Job card system",
    hint: "Floor and office in sync",
  },
  {
    href: "/how-motor-repair-shops-get-more-customers",
    label: "Get more customers",
    hint: "Leads and directory presence",
  },
  {
    href: "/list-your-electric-motor-services",
    label: "List your repair center",
    hint: "Directory & SEO",
  },
  {
    href: "/motor-repair-marketplace",
    label: "Marketplace for shops",
    hint: "List surplus from the Shop Management System",
  },
  {
    href: "/usa/motor-repair-business-listing",
    label: "USA business listings hub",
    hint: "State & city SEO pages",
  },
  {
    href: "/careers",
    label: "Careers & job postings",
    hint: "Hire technicians publicly",
  },
  {
    href: "/pricing",
    label: "Pricing",
    hint: "Plans for repair shops",
  },
  {
    href: "/blog",
    label: "Shop owner blog",
    hint: "Operations and marketing",
  },
  {
    href: "/contact",
    label: "Contact / demo",
    hint: "Talk to our team",
  },
  {
    href: "/features",
    label: "Platform features",
    hint: "Full capability overview",
  },
];

/**
 * Consistent internal linking for SEO topical clusters (buyer vs shop).
 * @param {{ excludeHref?: string; className?: string; audience?: "buyer" | "shop" }} props
 */
export default function MarketingRelatedGuides({
  excludeHref = "",
  className = "",
  audience = "buyer",
}) {
  const base = audience === "shop" ? SHOP_LINKS : BUYER_LINKS;
  const links = base.filter((item) => item.href !== excludeHref);
  const title = audience === "shop" ? "More for repair shops" : "Related guides";
  const blurb =
    audience === "shop"
      ? "Internal links connect shop owners to software, listings, leads, and marketplace tools on IQMotorBase.com."
      : "Explore more buyer resources on IQMotorBase.com, clear internal linking helps people and search engines discover related topics.";

  return (
    <section
      className={`not-prose rounded-xl border border-border bg-card/60 p-5 sm:p-6 ${className}`.trim()}
      aria-labelledby="related-guides-heading"
    >
      <h2 id="related-guides-heading" className="text-lg font-semibold text-title">
        {title}
      </h2>
      <p className="mt-2 text-sm text-secondary">{blurb}</p>
      <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-medium text-primary hover:underline">
              {item.label}
            </Link>
            <span className="text-secondary">, {item.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
