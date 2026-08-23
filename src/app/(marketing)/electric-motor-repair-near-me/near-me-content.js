"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import PublicListingCard from "@/components/listings/public-listing-card";
import ListingsWithRepairFormLayout from "@/components/marketing/listings-with-repair-form-layout";
import ListingsRepairFormSidebar from "@/components/marketing/listings-repair-form-sidebar";
import { LISTINGS_GRID, LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import { useToast } from "@/components/toast-provider";

export default function NearMeContent() {
  const toast = useToast();
  const autoNotifiedRef = useRef(null);
  const [locationStatus, setLocationStatus] = useState("loading");
  const [userLocation, setUserLocation] = useState({ city: "", state: "", zip: "" });
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifySending, setNotifySending] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [zipSearching, setZipSearching] = useState(false);

  const fetchListingsNear = useCallback(async (city, state, zip) => {
    setLoadingListings(true);
    try {
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (city) params.set("city", city);
      if (zip) params.set("zip", zip);
      const res = await fetch(`/api/listings/public?${params.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setListings(list);
      return list.length;
    } catch {
      setListings([]);
      return 0;
    } finally {
      setLoadingListings(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (latitude, longitude) => {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      if (!res.ok) throw new Error("BigDataCloud error");
      const data = await res.json();
      const city = (data.city || data.locality || "").trim();
      const state = (data.principalSubdivision || data.principalSubdivisionCode || "").trim();
      const zip = (data.postcode || "").trim();
      return { city, state, zip };
    } catch {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          { headers: { "Accept-Language": "en", "User-Agent": "IQMotorBaseNearMe/1.0" } }
        );
        if (!res.ok) throw new Error("Nominatim error");
        const data = await res.json();
        const city = (data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || "").trim();
        const state = (data.address?.state || data.address?.county || "").trim();
        const zip = (data.address?.postcode || "").trim();
        return { city, state, zip };
      } catch {
        return { city: "", state: "", zip: "" };
      }
    }
  }, []);

  const searchByZip = useCallback(
    async (rawZip) => {
      const zip = String(rawZip || "").trim();
      if (!zip) {
        toast.error("Please enter a ZIP code.");
        return;
      }
      setZipSearching(true);
      setNotifySent(false);
      try {
        setUserLocation({ city: "", state: "", zip });
        setLocationStatus("detected");
        await fetchListingsNear("", "", zip);
      } finally {
        setZipSearching(false);
      }
    },
    [fetchListingsNear, toast]
  );

  const detectLocation = useCallback(() => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      setLocationStatus("unresolved");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { city, state, zip } = await reverseGeocode(latitude, longitude);
        const hasLocation = Boolean(city || state || zip);
        if (!hasLocation) {
          setUserLocation({ city: "", state: "", zip: "" });
          setListings([]);
          setLocationStatus("unresolved");
          return;
        }
        setUserLocation({ city, state, zip });
        setLocationStatus("detected");
        const count = await fetchListingsNear(city, state, zip);
        if (count === 0) {
          const key = [city, state, zip].filter(Boolean).join("|");
          if (autoNotifiedRef.current !== key) {
            autoNotifiedRef.current = key;
            fetch("/api/notify-no-listings-near-me", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                city: city || undefined,
                state: state || undefined,
                zip: zip || undefined,
              }),
            }).catch((err) => console.error("Auto-notify no listings error:", err));
          }
        }
      },
      () => {
        setListings([]);
        setLocationStatus("unresolved");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchListingsNear, reverseGeocode]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const locationLabel = [userLocation.city, userLocation.state, userLocation.zip].filter(Boolean).join(", ") || "your area";
  const needsZipFallback =
    locationStatus === "unresolved" || locationStatus === "denied" || locationStatus === "error";

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {needsZipFallback && (
          <Button variant="primary" size="lg" className="w-full min-w-0 sm:w-auto" onClick={detectLocation}>
            Find shops near me
          </Button>
        )}
        <Link href="/electric-motor-repair-shops-listings" className="w-full min-w-0 sm:w-auto">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            Browse all listings
          </Button>
        </Link>
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
          {needsZipFallback && (
            <div className="mb-8 rounded-xl border border-border bg-card px-6 py-10 text-center sm:px-10 sm:py-12">
              <p className="text-2xl font-semibold leading-snug text-title sm:text-3xl">
                We could not resolve your location
              </p>
              <p className="mx-auto mt-3 max-w-xl text-base text-secondary sm:text-lg">
                Please enter your ZIP code below to find repair shops near you.
              </p>
              <form
                className="mx-auto mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch"
                onSubmit={(e) => {
                  e.preventDefault();
                  searchByZip(zipInput);
                }}
              >
                <Input
                  type="text"
                  name="nearMeZip"
                  autoComplete="postal-code"
                  placeholder="Enter ZIP code"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  className="min-w-0 flex-1"
                  inputClassName="text-base"
                  required
                />
                <Button type="submit" variant="primary" size="lg" disabled={zipSearching} className="w-full shrink-0 sm:w-auto">
                  {zipSearching ? "Searching…" : "Find shops"}
                </Button>
              </form>
              <p className="mt-4 text-sm text-secondary">
                Or allow location access and try again, or{" "}
                <Link href="/electric-motor-repair-shops-listings" className="font-medium text-primary hover:underline">
                  browse all listings
                </Link>
                .
              </p>
            </div>
          )}

          {locationStatus === "detected" && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-secondary">
                Showing centers near <span className="font-medium text-title">{locationLabel}</span>
                <button type="button" onClick={detectLocation} className="ml-2 text-sm text-primary hover:underline">
                  Update location
                </button>
              </p>
              {!loadingListings && (
                <p className="text-sm text-secondary">
                  {listings.length} center{listings.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
          )}

          {locationStatus === "loading" && loadingListings && (
            <p className="py-12 text-center text-secondary">Loading nearby centers…</p>
          )}

          {locationStatus === "loading" && !loadingListings && (
            <p className="py-12 text-center text-secondary">Getting your location…</p>
          )}

          {locationStatus === "detected" && !loadingListings && listings.length === 0 && (
            <div className="rounded-xl border border-border bg-card py-16 px-6 text-center">
              <p className="text-title font-medium">No repair shops found near {locationLabel}</p>
              <p className="mt-2 text-sm text-secondary">
                Try another ZIP code, browse all listings, or search by another city or state.
              </p>
              <form
                className="mx-auto mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  searchByZip(zipInput);
                }}
              >
                <Input
                  type="text"
                  name="nearMeZipRetry"
                  autoComplete="postal-code"
                  placeholder="Enter ZIP code"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button type="submit" variant="primary" disabled={zipSearching}>
                  {zipSearching ? "Searching…" : "Search ZIP"}
                </Button>
              </form>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <Link href="/electric-motor-repair-shops-listings" className="w-full min-w-0 sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Browse all listings
                  </Button>
                </Link>
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                <p className="text-sm font-medium text-title">Get notified when we add repair shops in your area</p>
                <p className="mt-1 text-xs text-secondary">We&apos;ll email you when listings are available near {locationLabel}.</p>
                {!notifySent ? (
                  <form
                    className="mt-4 flex flex-col sm:flex-row gap-2"
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
                            zip: userLocation.zip,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to sign up");
                        setNotifySent(true);
                        toast.success("You're on the list. We'll email you when we add repair shops in your area.");
                      } catch (e) {
                        toast.error(e.message || "Could not sign up. Please try again.");
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
                      className="flex-1 min-w-0"
                      required
                    />
                    <Button type="submit" variant="primary" disabled={notifySending}>
                      {notifySending ? "Sending…" : "Notify me"}
                    </Button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-success">You&apos;re on the list. We&apos;ll email you when we add repair shops here.</p>
                )}
              </div>
            </div>
          )}

          {locationStatus === "detected" && !loadingListings && listings.length > 0 && (
            <div className={LISTINGS_GRID}>
              {listings.map((listing, index) => (
                <PublicListingCard key={listing.id} listing={listing} imagePriority={index < 6} />
              ))}
            </div>
          )}
          </ListingsWithRepairFormLayout>
        </div>
      </section>
    </>
  );
}
