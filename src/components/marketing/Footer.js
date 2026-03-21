import Link from "next/link";
import FooterNavLinks from "./FooterNavLinks";

const footerLinks = {
  "For repair shops": [
    { href: "/usa/motor-repair-business-listing", label: "USA — list + CRM (SEO hub)" },
    { href: "/careers", label: "Careers — hire technicians (public job posts)" },
    { href: "/blog", label: "Shop owner blog" },
    { href: "/motor-repair-shop-management-software", label: "Shop management software" },
    { href: "/motor-repair-marketplace", label: "Marketplace for shops" },
    { href: "/list-your-electric-motor-services", label: "List your center" },
    { href: "/why-list-your-motor-repair-shop", label: "Why list your shop" },
    { href: "/how-motor-repair-shops-get-more-customers", label: "Get more customers" },
    { href: "/benefits-of-motor-repair-directory", label: "Directory benefits" },
  ],
  "For buyers": [
    { href: "/electric-motor-repair", label: "Electric motor repair hub" },
    { href: "/marketplace", label: "Parts & equipment marketplace" },
    { href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" },
    { href: "/electric-motor-reapir-near-me", label: "Repair shops near me" },
    { href: "/how-to-choose-electric-motor-repair-shop", label: "How to choose a shop" },
    { href: "/when-to-repair-or-replace-electric-motor", label: "Repair vs. replace" },
    { href: "/types-of-electric-motor-repair-services", label: "Types of repair" },
    { href: "/emergency-motor-repair-what-to-do", label: "Emergency repair" },
    { href: "/cost-of-motor-repair-and-rewinding", label: "Repair costs" },
  ],
  Company: [
    { href: "/#features", label: "Features & inventory" },
    { href: "/careers", label: "Careers & job postings" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
    { href: "/contact", label: "About" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link href="/" className="text-lg font-semibold text-title">
              MotorsWinding.com
            </Link>
            <p className="mt-2 text-sm text-secondary">
              Job management, shop parts inventory, lead generation, and public employee job postings for motor repair
              businesses.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-title">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-secondary hover:text-primary transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-8">
          <FooterNavLinks />
        </div>
        <div className="mt-8 text-center text-sm text-secondary">
          © {year} MotorsWinding.com. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
