import Link from "next/link";
import FooterNavLinks from "./FooterNavLinks";
import BrandLogo from "@/components/marketing/brand-logo";

const footerLinks = {
  "For repair shops": [
    { href: "/usa/motor-repair-business-listing", label: "USA: list + Shop Management System (SEO hub)" },
    { href: "/careers", label: "Careers: hire technicians (public job posts)" },
    { href: "/blog", label: "Blog: shop guides & calculators" },
    { href: "/iqwirecalculator", label: "IQWireCalculator: CM Best Match app" },
    { href: "/motor-repair-shop-management-software", label: "Shop management software" },
    { href: "/motor-repair-crm-software", label: "Motor repair shop management system" },
    { href: "/work-order-software-for-motor-repair-shops", label: "Work order software" },
    { href: "/motor-repair-inventory-software", label: "Inventory software" },
    { href: "/motor-repair-invoicing-and-quoting-software", label: "Invoicing & quoting" },
    { href: "/motor-repair-work-order-template", label: "Work order template (free)" },
    { href: "/repair-shop-invoice-template", label: "Invoice template (free)" },
    { href: "/blog/best-software-for-repair-shop-2026", label: "Best software comparison (2026)" },
    { href: "/motor-repair-marketplace", label: "Marketplace for shops" },
    { href: "/list-your-electric-motor-services", label: "List your center" },
    { href: "/why-list-your-motor-repair-shop", label: "Why list your shop" },
    { href: "/how-motor-repair-shops-get-more-customers", label: "Get more customers" },
    { href: "/benefits-of-motor-repair-directory", label: "Directory benefits" },
  ],
  "For buyers": [
    { href: "/electric-motor-repair", label: "Electric motor repair hub" },
    { href: "/industrial-motor-repair", label: "Industrial motor repair" },
    { href: "/marketplace", label: "Parts & equipment marketplace" },
    { href: "/electric-motor-repair-shops-listings", label: "Find repair shops" },
    { href: "/electric-motor-repair-near-me", label: "Repair shops near me" },
    { href: "/how-to-choose-electric-motor-repair-shop", label: "How to choose a shop" },
    { href: "/when-to-repair-or-replace-electric-motor", label: "Repair vs. replace" },
    { href: "/types-of-electric-motor-repair-services", label: "Types of repair" },
    { href: "/emergency-motor-repair-what-to-do", label: "Emergency repair" },
    { href: "/electric-motor-repair-manufacturing", label: "Manufacturing motor repair" },
    { href: "/electric-motor-repair-water-treatment", label: "Water treatment motor repair" },
    { href: "/electric-motor-repair-oil-gas", label: "Oil & gas motor repair" },
    { href: "/electric-motor-repair-food-processing", label: "Food processing motor repair" },
    { href: "/electric-motor-repair-mining", label: "Mining motor repair" },
    { href: "/cost-of-motor-repair-and-rewinding", label: "Repair costs" },
  ],
  Company: [
    { href: "/blog", label: "Blog" },
    { href: "/motor-repair-shop-management-software", label: "Motor Shop Management Software" },
    { href: "/#features", label: "Features & inventory" },
    { href: "/careers", label: "Careers: job postings" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
    { href: "/about", label: "About" },
  ],
  Legal: [
    { href: "/support", label: "IQWireCalculator Support" },
    { href: "/iqwirecalculator/privacy", label: "IQWireCalculator Privacy" },
    { href: "/iqwirecalculator/privacy-choices", label: "IQWireCalculator Privacy Choices" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-[86.4rem] px-4 py-8 sm:px-6 md:py-10">
        <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-start md:gap-8">
          <Link
            href="/"
            className="inline-block shrink-0 transition-opacity hover:opacity-90"
            aria-label="IQ Motorbase, home"
          >
            <BrandLogo className="h-[2.4rem] w-auto max-w-[min(100%,200px)] object-contain object-left md:h-[2.7rem] md:max-w-[min(100%,216px)]" />
          </Link>
          <p className="max-w-2xl text-sm leading-snug text-secondary md:pt-1">
            Job management, shop parts inventory, lead generation, and public employee job postings for motor repair
            businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-6 min-[400px]:grid-cols-2 sm:gap-x-8 md:grid-cols-4 md:gap-x-5 lg:gap-x-8">
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="min-w-0">
              <h3 className="text-sm font-semibold text-title">{title}</h3>
              <ul className="mt-2 space-y-1.5">
                {links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="inline-block max-w-full break-words text-sm leading-snug text-secondary transition-colors hover:text-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-border pt-6 sm:mt-10 sm:pt-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
            <FooterNavLinks />
            <p className="shrink-0 text-center text-sm text-secondary sm:text-right">
              © {year} IQMotorBase.com. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
