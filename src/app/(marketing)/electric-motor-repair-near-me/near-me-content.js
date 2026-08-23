"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import PublicListingCard from "@/components/listings/public-listing-card";
import ListingsWithRepairFormLayout from "@/components/marketing/listings-with-repair-form-layout";
import ListingsRepairFormSidebar from "@/components/marketing/listings-repair-form-sidebar";
import { LISTINGS_GRID, LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import { US_STATES } from "@/lib/directory-listing-constants";
import { useToast } from "@/components/toast-provider";

const STATE_OPTIONS = [{ value: "", label: "Select state…" }, ...US_STATES.map((st) => ({ value: st, label: st }))];

export default function NearMeContent() {
  const toast = useToast();
  const autoNotifiedRef = useRef(null);
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState({ city: "", state: "" });
  const [listings, setListings] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifySending, setNotifySending] = useState(false);

  const fetchListingsNear = useCallback(async (city, state) => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (city) params.set("city", city);
      const res = await fetch(`/api/listings/public?${params.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setListings(list);
      return list.length;
    } catch {
      setListings([]);
      return 0;
    } finally {
      setSearching(false);
    }
  }, []);

  const searchByLocation = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const city = searchCity.trim();
      const state = searchState.trim();
      if (!city && !state) {
        toast.error("Enter a city or select a state to search.");
        return;
      }
      setNotifySent(false);
      setHasSearched(true);
      setUserLocation({ city, state });
      const count = await fetchListingsNear(city, state);
      if (count === 0) {
        const key = [city, state].filter(Boolean).join("|");
        if (autoNotifiedRef.current !== key) {
          autoNotifiedRef.current = key;
          fetch("/api/notify-no-listings-near-me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: city || undefined,
              state: state || undefined,
            }),
          }).catch((err) => console.error("Auto-notify no listings error:", err));
        }
      }
    },
    [fetchListingsNear, searchCity, searchState, toast]
  );

  const locationLabel = [userLocation.city, userLocation.state].filter(Boolean).join(", ") || "your area";

  return (
    <>
      <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-lg font-semibold text-title">Find repair shops in your area</p>
        <p className="mt-1 text-sm text-secondary">Enter your city and state — we&apos;ll show matching shops and pre-fill your repair request.</p>
        <form
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={searchByLocation}
        >
          <Input
            label="City"
            name="nearMeCity"
            autoComplete="address-level2"
            placeholder="e.g. Houston"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
          />
          <Select
            label="State"
            name="nearMeState"
            options={STATE_OPTIONS}
            value={searchState}
            onChange={(e) => setSearchState(e.target.value)}
            searchable
          />
          <Button type="submit" variant="primary" size="lg" disabled={searching} className="w-full sm:w-auto sm:min-w-[8.5rem]">
            {searching ? "Searching…" : "Find shops"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-secondary">
          Or{" "}
          <Link href="/electric-motor-repair-shops-listings" className="font-medium text-primary hover:underline">
            browse all repair shop listings
          </Link>
          .
        </p>
      </div>

      <section className="py-10 sm:py-14">
        <div className={LISTINGS_PAGE_CONTAINER}>
          <ListingsWithRepairFormLayout
            sidebar={
              <ListingsRepairFormSidebar mode="city" city={userLocation.city} state={userLocation.state} />
            }
          >
            {!hasSearched ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center sm:px-10">
                <p className="text-lg font-medium text-title">Enter your city above to see nearby shops</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-secondary">
                  Search by city and state to load repair centers that serve your area. Your repair request form will
                  match the same location.
                </p>
              </div>
            ) : null}

            {hasSearched && !searching ? (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-secondary">
                  Showing centers near <span className="font-medium text-title">{locationLabel}</span>
                </p>
                <p className="text-sm text-secondary">
                  {listings.length} center{listings.length !== 1 ? "s" : ""} found
                </p>
              </div>
            ) : null}

            {searching ? <p className="py-12 text-center text-secondary">Searching for repair shops…</p> : null}

            {hasSearched && !searching && listings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
                <p className="font-medium text-title">No repair shops found near {locationLabel}</p>
                <p className="mt-2 text-sm text-secondary">
                  Try a nearby city, search by state only, or browse the full directory.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    Change city
                  </Button>
                  <Link href="/electric-motor-repair-shops-listings">
                    <Button variant="primary">Browse all listings</Button>
                  </Link>
                </div>
                <div className="mx-auto mt-8 max-w-sm">
                  <p className="text-sm font-medium text-title">Get notified when we add repair shops in your area</p>
                  <p className="mt-1 text-xs text-secondary">
                    We&apos;ll email you when listings are available near {locationLabel}.
                  </p>
                  {!notifySent ? (
                    <form
                      className="mt-4 flex flex-col gap-2 sm:flex-row"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!notifyEmail.trim()) return;
                        setNotifySending(true);
                        try {
                          const res = await fetch("/api/area-notify-request", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: notifyEmail.trim(),
                              city: userLocation.city,
                              state: userLocation.state,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed to sign up");
                          setNotifySent(true);
                          toast.success("You're on the list. We'll email you when we add repair shops in your area.");
                        } catch (err) {
                          toast.error(err.message || "Could not sign up. Please try again.");
                        } finally {
                          setNotifySending(false);
                        }
                      }}
                    >
                      <Input
                        type="email"
                        placeholder="Your email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className="min-w-0 flex-1"
                        required
                      />
                      <Button type="submit" variant="primary" disabled={notifySending}>
                        {notifySending ? "Sending…" : "Notify me"}
                      </Button>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm text-success">
                      You&apos;re on the list. We&apos;ll email you when we add repair shops here.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {hasSearched && !searching && listings.length > 0 ? (
              <div className={LISTINGS_GRID}>
                {listings.map((listing, index) => (
                  <PublicListingCard key={listing.id} listing={listing} imagePriority={index < 6} />
                ))}
              </div>
            ) : null}
          </ListingsWithRepairFormLayout>
        </div>
      </section>
    </>
  );
}
