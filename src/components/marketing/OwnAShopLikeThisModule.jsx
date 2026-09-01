import Link from "next/link";
import { SEO_SOFTWARE_PILLAR_PATH } from "@/lib/seo-software-paths";

/**
 * Template-level internal-link module for directory listing pages and city/location pages
 * (documents/Seo.md §2).
 */
export default function OwnAShopLikeThisModule({ className = "" }) {
  return (
    <aside
      className={`rounded-xl border border-border bg-card px-5 py-5 sm:px-6 sm:py-6 ${className}`.trim()}
      aria-labelledby="own-a-shop-like-this-heading"
    >
      <h2 id="own-a-shop-like-this-heading" className="text-lg font-bold text-title sm:text-xl">
        Own a shop like this?
      </h2>
      <p className="mt-2 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
        Run job write-ups, work orders, inventory, invoicing, and repair leads in one system built for electric
        motor repair shops, not adapted from auto repair software.
      </p>
      <p className="mt-4">
        <Link
          href={SEO_SOFTWARE_PILLAR_PATH}
          className="text-sm font-semibold text-primary hover:underline sm:text-base"
        >
          See motor repair shop management software →
        </Link>
      </p>
    </aside>
  );
}
