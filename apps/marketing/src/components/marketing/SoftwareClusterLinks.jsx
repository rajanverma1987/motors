import Link from "next/link";
import { SEO_SOFTWARE_CLUSTER_LINKS } from "@/lib/seo-software-paths";

/**
 * Internal links across the software SEO cluster (Seo.md: every page links to 3+ siblings + pillar).
 */
export default function SoftwareClusterLinks({
  excludeHref = "",
  title = "Related motor repair software guides",
  className = "mt-12 border-t border-border pt-10",
  extraLinks = [],
}) {
  const links = [
    ...SEO_SOFTWARE_CLUSTER_LINKS.filter((l) => l.href !== excludeHref),
    ...extraLinks.filter((l) => l.href && l.href !== excludeHref),
  ];
  if (!links.length) return null;
  return (
    <section className={className} aria-labelledby="software-cluster-links-heading">
      <h2 id="software-cluster-links-heading" className="text-2xl font-bold text-title sm:text-3xl">
        {title}
      </h2>
      <ul className="mt-4 list-none space-y-2 p-0">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-primary font-medium hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
