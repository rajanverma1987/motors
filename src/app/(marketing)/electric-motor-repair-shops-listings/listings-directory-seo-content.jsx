import Link from "next/link";
import ListingDetailFaqSection from "./[slug]/listing-detail-faq-section";
import { LISTINGS_DIRECTORY_FAQ_ITEMS } from "./listings-directory-seo-data";

/**
 * Keyword-focused directory footer for crawlers and buyers scrolling past the grid.
 * @param {{ total: number }} props
 */
export default function ListingsDirectorySeoContent({ total = 0 }) {
  const totalLabel = total > 0 ? `${total.toLocaleString("en-US")}+` : "1,300+";

  return (
    <aside
      id="electric-motor-repair-directory-guide"
      className="mt-16 border-t border-border pt-12"
      aria-label="Electric motor repair directory guide"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
        Electric motor repair directory
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-title sm:text-3xl">
        Find electric motor repair shops and rewinding centers
      </h2>
      <p id="listings-directory-summary" className="mt-4 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
        IQMotorBase.com publishes this <strong className="text-title">electric motor repair</strong> directory so
        facilities, maintenance teams, and buyers can locate qualified <strong className="text-title">electric motor
        repair shops</strong> without relying on outdated phone books or generic maps. Browse {totalLabel} listed
        centers, filter by location, and compare <strong className="text-title">industrial electric motor repair</strong>{" "}
        and commercial capabilities before you ship a motor or request on-site service.
      </p>

      <section className="mt-10" aria-labelledby="what-is-electric-motor-repair">
        <h3 id="what-is-electric-motor-repair" className="text-xl font-bold text-title sm:text-2xl">
          What is electric motor repair?
        </h3>
        <p className="mt-3 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
          <strong className="text-title">Electric motor repair</strong> restores failed or worn motors to operating
          condition through inspection, parts replacement, rewinding, machining, and testing. Unlike simply swapping
          in a new unit, repair preserves custom frames, mountings, and plant spares when the core assembly is sound.
          Shops listed here perform <strong className="text-title">AC motor repair</strong>, DC and servo work, pump
          motors, fans, compressors, and specialty designs. For a broader buyer hub with guides and tools, start at the{" "}
          <Link href="/electric-motor-repair" className="font-medium text-primary hover:underline">
            electric motor repair resource hub
          </Link>
          .
        </p>
      </section>

      <section className="mt-10" aria-labelledby="electric-motor-repair-services">
        <h3 id="electric-motor-repair-services" className="text-xl font-bold text-title sm:text-2xl">
          Electric motor repair services in this directory
        </h3>
        <p className="mt-3 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
          Listings may offer bearing and seal service, shaft repair, insulation upgrades,{" "}
          <strong className="text-title">electric motor rewinding</strong>, dynamic balancing, alignment, and
          electrical testing. Industrial programs often include medium-voltage experience, explosion-proof motors, and
          documented test reports. Review each profile for scope, then read{" "}
          <Link href="/types-of-electric-motor-repair-services" className="font-medium text-primary hover:underline">
            types of electric motor repair services
          </Link>{" "}
          to align shop capabilities with your equipment.
        </p>
        <ul className="mt-4 max-w-[57.6rem] list-disc space-y-2 pl-5 text-sm text-secondary sm:text-base">
          <li>
            <strong className="text-title">Rewinding &amp; electrical repair</strong> — stator and armature rewinds,
            coil replacement, insulation systems, and surge testing.
          </li>
          <li>
            <strong className="text-title">Mechanical repair</strong> — bearings, housings, end bells, shafts, and
            coupling work.
          </li>
          <li>
            <strong className="text-title">Field &amp; emergency service</strong> — expedited turnaround and on-site
            support when production is down; see{" "}
            <Link href="/emergency-motor-repair-what-to-do" className="font-medium text-primary hover:underline">
              emergency motor repair guidance
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="how-to-choose-electric-motor-repair">
        <h3 id="how-to-choose-electric-motor-repair" className="text-xl font-bold text-title sm:text-2xl">
          How to choose an electric motor repair shop
        </h3>
        <p className="mt-3 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
          Shortlist two or three shops from this <strong className="text-title">electric motor repair</strong> directory,
          then compare written quotes, testing scope, warranty, and lead time. Match voltage, horsepower, and
          application (hazardous location, vertical pump, etc.) to shop experience. Our{" "}
          <Link href="/how-to-choose-electric-motor-repair-shop" className="font-medium text-primary hover:underline">
            how to choose an electric motor repair shop
          </Link>{" "}
          guide covers certifications, red flags, and questions to ask before you authorize work. When price is the
          main driver, pair quotes with the{" "}
          <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
            cost of electric motor repair and rewinding
          </Link>{" "}
          calculator and reference tables.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="electric-motor-repair-near-you">
        <h3 id="electric-motor-repair-near-you" className="text-xl font-bold text-title sm:text-2xl">
          Electric motor repair near you
        </h3>
        <p className="mt-3 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
          Search this page by city, state, or ZIP to find <strong className="text-title">electric motor repair near
          me</strong> candidates, or use{" "}
          <Link href="/electric-motor-repair-near-me" className="font-medium text-primary hover:underline">
            electric motor repair near me
          </Link>{" "}
          for distance-sorted results when you allow location access. Proximity matters for freight cost and pickup, but
          capability and testing quality should drive the final choice for critical motors.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="repair-vs-replace-electric-motor">
        <h3 id="repair-vs-replace-electric-motor" className="text-xl font-bold text-title sm:text-2xl">
          Repair vs. replace electric motors
        </h3>
        <p className="mt-3 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
          Not every failure warrants a full rewind. Sometimes bearing service or a single component repair returns the
          motor to service quickly. When windings are damaged or efficiency is poor, compare repair quotes against
          replacement and energy savings. Read{" "}
          <Link href="/when-to-repair-or-replace-electric-motor" className="font-medium text-primary hover:underline">
            when to repair or replace an electric motor
          </Link>{" "}
          before authorizing expensive work.
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="list-your-shop">
        <h3 id="list-your-shop" className="text-lg font-bold text-title sm:text-xl">
          List your electric motor repair shop
        </h3>
        <p className="mt-2 max-w-[57.6rem] text-sm leading-relaxed text-secondary">
          Repair centers can{" "}
          <Link href="/list-your-electric-motor-services" className="font-medium text-primary hover:underline">
            list electric motor repair services
          </Link>{" "}
          on IQMotorBase.com to appear in this directory, receive quote requests, and access shop software. Explore the{" "}
          <Link href="/marketplace" className="font-medium text-primary hover:underline">
            motor repair marketplace
          </Link>{" "}
          and{" "}
          <Link href="/usa/motor-repair-business-listing" className="font-medium text-primary hover:underline">
            USA motor repair business listings
          </Link>{" "}
          for additional visibility.
        </p>
      </section>

      <ListingDetailFaqSection
        items={LISTINGS_DIRECTORY_FAQ_ITEMS}
        heading="Electric motor repair FAQ"
        description="Answers to common questions about finding electric motor repair shops, costs, services, and how to use this directory."
      />
    </aside>
  );
}
