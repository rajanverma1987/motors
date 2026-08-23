"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/select";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { US_STATES } from "@/lib/directory-listing-constants";

function phoneHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("1") ? digits : `1${digits}`}` : "";
}

function formatPhoneDisplay(phone) {
  const raw = String(phone || "").trim();
  return raw || "";
}

/**
 * @param {{ shops: Array<{ id: string, companyName?: string, phone?: string, city?: string, state?: string, urlSlug?: string }> }} props
 */
export default function EmergencyShopsStrip({ shops = [] }) {
  const [stateFilter, setStateFilter] = useState("");

  const stateOptions = useMemo(() => {
    const fromShops = new Set(
      shops.map((s) => String(s.state || "").trim()).filter(Boolean)
    );
    const ordered = US_STATES.filter((st) => fromShops.has(st));
    return [{ value: "", label: "All states" }, ...ordered.map((st) => ({ value: st, label: st }))];
  }, [shops]);

  const filtered = useMemo(() => {
    if (!stateFilter) return shops;
    return shops.filter((s) => String(s.state || "").trim() === stateFilter);
  }, [shops, stateFilter]);

  if (!shops.length) {
    return (
      <section aria-labelledby="emergency-shops-heading" className="mt-12 rounded-xl border border-border bg-card p-6">
        <h2 id="emergency-shops-heading" className="text-xl font-bold text-title sm:text-2xl">
          24/7 emergency repair shops
        </h2>
        <p className="mt-3 text-sm text-secondary">
          No shops with confirmed 24/7 intake are listed yet. Submit your request above — we&apos;ll match you as shops
          are added. Or{" "}
          <Link href="/electric-motor-repair-shops-listings" className="font-medium text-primary hover:underline">
            browse all repair centers
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="emergency-shops-heading" className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="emergency-shops-heading" className="text-xl font-bold text-title sm:text-2xl">
            24/7 emergency repair shops — call now
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Phone numbers for shops with confirmed emergency or rush capability. Filter by state, or call directly while
            your request is being matched.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <Select
            label="Filter by state"
            name="emergencyShopState"
            options={stateOptions}
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            searchable
          />
        </div>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {filtered.map((shop) => {
          const location = [shop.city, shop.state].filter(Boolean).join(", ");
          const phone = formatPhoneDisplay(shop.phone);
          const href = phoneHref(shop.phone);
          const slug = getListingPublicPathSegment(shop);
          return (
            <li
              key={shop.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-danger/30"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/electric-motor-repair-shops-listings/${slug}`}
                    className="font-semibold text-title hover:text-primary hover:underline"
                  >
                    {shop.companyName || "Repair center"}
                  </Link>
                  {location ? <p className="mt-0.5 text-sm text-secondary">{location}</p> : null}
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-danger">24/7 / rush</p>
                </div>
                {phone && href ? (
                  <a
                    href={href}
                    className="inline-flex shrink-0 items-center rounded-lg bg-danger px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
                  >
                    {phone}
                  </a>
                ) : (
                  <span className="text-xs text-secondary">Phone on profile</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">
          No emergency shops listed for {stateFilter}.{" "}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => setStateFilter("")}>
            Show all states
          </button>
        </p>
      ) : null}
    </section>
  );
}
