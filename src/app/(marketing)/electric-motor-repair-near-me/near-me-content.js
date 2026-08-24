"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { FiMapPin } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import PublicListingCard from "@/components/listings/public-listing-card";
import ListingsWithRepairFormLayout from "@/components/marketing/listings-with-repair-form-layout";
import ListingsRepairFormSidebar from "@/components/marketing/listings-repair-form-sidebar";
import { LISTINGS_GRID, LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import { US_STATES } from "@/lib/directory-listing-constants";
import { normalizeLocationInput } from "@/lib/us-state-normalize";
import { useToast } from "@/components/toast-provider";

const STATE_OPTIONS = [{ value: "", label: "Select state…" }, ...US_STATES.map((st) => ({ value: st, label: st }))];
const STORAGE_KEY = "iqmotorbase_near_me_location";

function readStoredLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizeLocationInput(parsed);
    if (!normalized.city && !normalized.state && !normalized.zip) return null;
    return normalized;
  } catch {
    return null;
  }
}

function readUrlLocation() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const normalized = normalizeLocationInput({
    city: params.get("city"),
    state: params.get("state"),
    zip: params.get("zip"),
  });
  if (!normalized.city && !normalized.state && !normalized.zip) return null;
  return normalized;
}

function persistLocation(location) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    /* ignore quota errors */
  }
  const params = new URLSearchParams();
  if (location.city) params.set("city", location.city);
  if (location.state) params.set("state", location.state);
  if (location.zip) params.set("zip", location.zip);
  const qs = params.toString();
  const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

export default function NearMeContent() {
  const toast = useToast();
  const autoNotifiedRef = useRef(null);
  const initStartedRef = useRef(false);
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchZip, setSearchZip] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [prefilling, setPrefilling] = useState(true);
  const [userLocation, setUserLocation] = useState({ city: "", state: "", zip: "" });
  const [listings, setListings] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifySending, setNotifySending] = useState(false);

  const fetchListingsNear = useCallback(async (location) => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (location.state) params.set("state", location.state);
      if (location.city) params.set("city", location.city);
      if (location.zip) params.set("zip", location.zip);
      const res = await fetch(`/api/listings/nearby?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      const list = Array.isArray(data.listings) ? data.listings : [];
      setListings(list);
      return list.length;
    } catch {
      setListings([]);
      return 0;
    } finally {
      setSearching(false);
    }
  }, []);

  const runSearch = useCallback(
    async (rawLocation, { notifyOnEmpty = true } = {}) => {
      const location = normalizeLocationInput(rawLocation);
      if (!location.city && !location.state && !location.zip) {
        toast.error("Enter a city, state, or ZIP code to search.");
        return 0;
      }

      setSearchCity(location.city);
      setSearchState(location.state);
      setSearchZip(location.zip);
      setNotifySent(false);
      setHasSearched(true);
      setUserLocation(location);
      persistLocation(location);

      const count = await fetchListingsNear(location);

      if (count === 0 && notifyOnEmpty) {
        const key = [location.city, location.state, location.zip].filter(Boolean).join("|");
        if (autoNotifiedRef.current !== key) {
          autoNotifiedRef.current = key;
          fetch("/api/notify-no-listings-near-me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: location.city || undefined,
              state: location.state || undefined,
            }),
          }).catch((err) => console.error("Auto-notify no listings error:", err));
        }
      }

      return count;
    },
    [fetchListingsNear, toast]
  );

  const searchByLocation = useCallback(
    async (e) => {
      e?.preventDefault?.();
      await runSearch({ city: searchCity, state: searchState, zip: searchZip });
    },
    [runSearch, searchCity, searchState, searchZip]
  );

  const useMyLocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location is not supported in this browser.");
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 300000,
        });
      });
      const { latitude, longitude } = position.coords;
      const res = await fetch(`/api/geo/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();
      const location = normalizeLocationInput(data);
      if (!location.city && !location.state && !location.zip) {
        toast.error("Could not determine your city from GPS. Enter it manually.");
        return;
      }
      const count = await runSearch(location);
      if (count > 0) {
        toast.success(`Showing shops near ${[location.city, location.state].filter(Boolean).join(", ")}`);
      }
    } catch (err) {
      const code = err?.code;
      if (code === 1) {
        toast.error("Location permission denied. Enter your city manually or allow location access.");
      } else if (code === 2) {
        toast.error("Location unavailable. Try entering your city and state.");
      } else if (code === 3) {
        toast.error("Location timed out. Try again or enter your city manually.");
      } else {
        toast.error("Could not use your location. Enter your city and state.");
      }
    } finally {
      setLocating(false);
    }
  }, [runSearch, toast]);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    async function initLocation() {
      const fromUrl = readUrlLocation();
      if (fromUrl) {
        setSearchCity(fromUrl.city);
        setSearchState(fromUrl.state);
        setSearchZip(fromUrl.zip);
        setPrefilling(false);
        await runSearch(fromUrl, { notifyOnEmpty: true });
        return;
      }

      const stored = readStoredLocation();
      if (stored) {
        setSearchCity(stored.city);
        setSearchState(stored.state);
        setSearchZip(stored.zip);
        setPrefilling(false);
        await runSearch(stored, { notifyOnEmpty: false });
        return;
      }

      try {
        const res = await fetch("/api/geo");
        const data = await res.json();
        const location = normalizeLocationInput(data);
        if (location.city || location.state || location.zip) {
          setSearchCity(location.city);
          setSearchState(location.state);
          setSearchZip(location.zip);
          await runSearch(location, { notifyOnEmpty: true });
        }
      } catch {
        /* silent — manual entry fallback */
      } finally {
        setPrefilling(false);
      }
    }

    initLocation();
  }, [runSearch]);

  const locationLabel =
    [userLocation.city, userLocation.state].filter(Boolean).join(", ") ||
    (userLocation.zip ? `ZIP ${userLocation.zip}` : "your area");

  const formBusy = searching || locating || prefilling;

  return (
    <>
      <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-lg font-semibold text-title">Find repair shops in your area</p>
        <p className="mt-1 text-sm text-secondary">
          We&apos;ll detect your area when possible — or enter city, state, and ZIP. Matching shops pre-fill your repair
          request.
        </p>
        <form
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_7rem_auto_auto]"
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
          <Input
            label="ZIP"
            name="nearMeZip"
            autoComplete="postal-code"
            placeholder="77001"
            value={searchZip}
            onChange={(e) => setSearchZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputClassName="font-mono tracking-wide"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={formBusy}
            className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto lg:min-w-[8.5rem] lg:self-end"
          >
            {searching ? "Searching…" : "Find shops"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={formBusy}
            onClick={useMyLocation}
            className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto lg:self-end"
          >
            <FiMapPin className="h-4 w-4 shrink-0" aria-hidden />
            {locating ? "Locating…" : "Use my location"}
          </Button>
        </form>
        {prefilling && !hasSearched ? (
          <p className="mt-3 text-sm text-secondary">Detecting your area…</p>
        ) : null}
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
              <ListingsRepairFormSidebar
                mode="city"
                city={userLocation.city}
                state={userLocation.state}
                zipCode={userLocation.zip}
              />
            }
          >
            {!hasSearched && !prefilling ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center sm:px-10">
                <p className="text-lg font-medium text-title">Enter your location above to see nearby shops</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-secondary">
                  Search by city, state, or ZIP — or tap &ldquo;Use my location&rdquo;. Your repair request form will
                  match the same area.
                </p>
              </div>
            ) : null}

            {prefilling && !hasSearched ? (
              <p className="py-12 text-center text-secondary">Loading shops near you…</p>
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
                    Change location
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
                  <PublicListingCard
                    key={listing.id}
                    listing={listing}
                    imagePriority={index < 6}
                    locationMatchType={listing.locationMatchType || null}
                  />
                ))}
              </div>
            ) : null}
          </ListingsWithRepairFormLayout>
        </div>
      </section>
    </>
  );
}
