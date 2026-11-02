"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiLock } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { US_STATES } from "@/lib/directory-listing-constants";
import { isValidEmail } from "@/lib/validation";
import { saveLeadContact, withLeadContactPrefill } from "@/lib/lead-contact-storage";

function phoneHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("1") ? digits : `1${digits}`}` : "";
}

function formatPhoneDisplay(phone) {
  const raw = String(phone || "").trim();
  return raw || "";
}

const unlockKey = (shopId) => `contact_unlocked_${shopId}`;

function EmergencyShopPhone({ shop, phone, href }) {
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const slug = getListingPublicPathSegment(shop);

  useEffect(() => {
    try {
      if (shop.id && sessionStorage.getItem(unlockKey(shop.id)) === "true") setUnlocked(true);
    } catch {
      /* ignore */
    }
  }, [shop.id]);

  useEffect(() => {
    setForm((prev) => withLeadContactPrefill(prev));
  }, []);

  const valid =
    form.name.trim() !== "" && isValidEmail(form.email) && form.phone.trim().length >= 7;

  const unlock = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/leads/contact-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          shopSlug: slug,
          shopName: shop.companyName || "",
          city: shop.city || "",
          state: shop.state || "",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }
      saveLeadContact({
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: shop.city || "",
        state: shop.state || "",
      });
      setUnlocked(true);
      setOpen(false);
      try {
        sessionStorage.setItem(unlockKey(shop.id), "true");
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="contact-seo-hidden" aria-hidden="true">
        <a href={href} className="seo-phone">
          {phone}
        </a>
      </div>
      {unlocked ? (
        <a
          href={href}
          className="inline-flex shrink-0 items-center rounded-lg bg-danger px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          {phone}
        </a>
      ) : (
        <Button type="button" size="sm" className="shrink-0 bg-danger hover:opacity-90" onClick={() => setOpen(true)}>
          View Contact
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
        title="View contact"
        size="lg"
      >
        <form id={`emergency-contact-${shop.id}`} onSubmit={unlock} className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Enter your details to see {shop.companyName || "this shop"}&apos;s phone number.
          </p>
          <Input
            label="Your name"
            name="name"
            required
            autoComplete="name"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Work email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Phone number"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="Best number to reach you"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          {error ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-xs text-secondary">
            <FiLock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Your details are only shared with {shop.companyName || "this shop"}
          </p>
          <Button type="submit" size="lg" className="w-full" disabled={!valid || busy}>
            {busy ? "Revealing contact…" : "View Contact"}
          </Button>
        </form>
      </Modal>
    </>
  );
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
          No shops with confirmed 24/7 intake are listed yet. Submit your request above, we&apos;ll match you as shops
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
            24/7 emergency repair shops, call now
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Shops with confirmed emergency or rush capability. Filter by state, then use View Contact to see the phone
            number and call while your request is being matched.
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
              className="relative rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-danger/30"
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
                  <EmergencyShopPhone shop={shop} phone={phone} href={href} />
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
