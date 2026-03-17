"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { getListingSlug } from "@/lib/listing-slug";
import ListingsHeroCta from "@/app/(marketing)/electric-motor-reapir-shops-listings/listings-hero-cta";
import { useToast } from "@/components/toast-provider";

function ListingCard({ listing }) {
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  const logoUrl = listing.logoUrl?.trim();
  const firstPhoto = Array.isArray(listing.galleryPhotoUrls) && listing.galleryPhotoUrls[0]
    ? listing.galleryPhotoUrls[0]
    : null;
  const imageUrl = logoUrl || (firstPhoto?.startsWith("http") ? firstPhoto : firstPhoto?.startsWith("/") ? firstPhoto : null);
  const slug = getListingSlug(listing.companyName, listing.id);

  return (
    <Link
      href={`/electric-motor-reapir-shops-listings/${slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg hover:border-primary/30"
    >
      {imageUrl && (
        <div className="aspect-video w-full bg-bg">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold text-title">{listing.companyName}</h2>
        {location && (
          <p className="mt-1 text-sm text-secondary">{location}</p>
        )}
        {listing.shortDescription && (
          <p className="mt-2 line-clamp-3 text-sm text-secondary">
            {listing.shortDescription}
          </p>
        )}
        <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
          View details →
        </span>
      </div>
    </Link>
  );
}

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

  const detectLocation = useCallback(() => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const city = (data.city || data.locality || "").trim();
          const state = (data.principalSubdivision || data.principalSubdivisionCode || "").trim();
          const zip = (data.postcode || "").trim();
          setUserLocation({ city, state, zip });
          setLocationStatus("detected");
          const count = await fetchListingsNear(city, state, zip);
          if (count === 0) {
            const hasLocation = city || state || zip;
            if (hasLocation) {
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
          }
        } catch {
          setLocationStatus("error");
          setListings([]);
        }
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchListingsNear]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const locationLabel = [userLocation.city, userLocation.state, userLocation.zip].filter(Boolean).join(", ") || "your area";

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {(locationStatus === "denied" || locationStatus === "error") && (
          <Button variant="primary" size="lg" onClick={detectLocation}>
            Find shops near me
          </Button>
        )}
        <Link href="/electric-motor-reapir-shops-listings">
          <Button variant="outline" size="lg">
            Browse all listings
          </Button>
        </Link>
      </div>
      <ListingsHeroCta />
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {locationStatus === "denied" && (
            <div className="mb-8 rounded-xl border border-border bg-card p-6 text-center">
              <p className="font-medium text-title">Location access was denied</p>
              <p className="mt-2 text-sm text-secondary">
                To see shops near you, allow location in your browser and click &quot;Find shops near me&quot; above, or browse all listings.
              </p>
              <Link href="/electric-motor-reapir-shops-listings" className="mt-4 inline-block">
                <Button variant="outline">Browse all listings</Button>
              </Link>
            </div>
          )}

          {locationStatus === "error" && (
            <div className="mb-8 rounded-xl border border-border bg-card p-6 text-center">
              <p className="font-medium text-title">We couldn&apos;t get your location</p>
              <p className="mt-2 text-sm text-secondary">
                Your browser may not support location, or there was a temporary error. Try again or browse all listings.
              </p>
              <Button variant="outline" className="mt-4" onClick={detectLocation}>
                Try again
              </Button>
            </div>
          )}

          {(locationStatus === "detected" || locationStatus === "loading") && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              {locationStatus === "detected" && (
                <p className="text-sm text-secondary">
                  Showing centers near <span className="font-medium text-title">{locationLabel}</span>
                  <button type="button" onClick={detectLocation} className="ml-2 text-sm text-primary hover:underline">
                    Update location
                  </button>
                </p>
              )}
              {locationStatus === "detected" && !loadingListings && (
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
              <p className="text-title font-medium">No repair centers found near {locationLabel}</p>
              <p className="mt-2 text-sm text-secondary">
                Try browsing all listings or search by another city or state.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/electric-motor-reapir-shops-listings">
                  <Button variant="outline">Browse all listings</Button>
                </Link>
              </div>
              <div className="mt-8 max-w-sm mx-auto">
                <p className="text-sm font-medium text-title">Get notified when we add repair centers in your area</p>
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
                        toast.success("You're on the list. We'll email you when we add repair centers in your area.");
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
                  <p className="mt-4 text-sm text-success">You&apos;re on the list. We&apos;ll email you when we add repair centers here.</p>
                )}
              </div>
            </div>
          )}

          {locationStatus === "detected" && !loadingListings && listings.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
