"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { FiMapPin } from "react-icons/fi";
import Button from "@/components/ui/button";
import PublicListingCard from "@/components/listings/public-listing-card";
import ListingsWithRepairFormLayout from "@/components/marketing/listings-with-repair-form-layout";
import ListingsRepairFormSidebar from "@/components/marketing/listings-repair-form-sidebar";
import { LISTINGS_GRID, LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import { normalizeLocationInput } from "@/lib/us-state-normalize";
import { useToast } from "@/components/toast-provider";

const STORAGE_KEY = "iqmotorbase_near_me_location";
const ALL_LISTINGS_HREF = "/electric-motor-repair-shops-listings";

function hasLocation(location) {
  return Boolean(location?.city || location?.state || location?.zip);
}

function persistLocation(location) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    /* ignore quota errors */
  }
}

function requestGpsPosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(Object.assign(new Error("unsupported"), { code: 0 }));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
}

export default function NearMeContent() {
  const toast = useToast();
  const autoNotifiedRef = useRef(null);
  const initStartedRef = useRef(false);
  const coordsRef = useRef(null);
  const [phase, setPhase] = useState("checking");
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState({ city: "", state: "", zip: "" });
  const [listings, setListings] = useState([]);

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

  const showShops = useCallback(
    async (rawLocation) => {
      const location = normalizeLocationInput(rawLocation);
      if (!hasLocation(location)) {
        setPhase("failed");
        return;
      }
      setUserLocation(location);
      persistLocation(location);
      setPhase("results");
      const count = await fetchListingsNear(location);
      if (count === 0) {
        const key = [location.city, location.state, location.zip].filter(Boolean).join("|");
        if (autoNotifiedRef.current !== key) {
          autoNotifiedRef.current = key;
          const coords = coordsRef.current;
          fetch("/api/notify-no-listings-near-me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: location.city || undefined,
              state: location.state || undefined,
              zip: location.zip || undefined,
              lat: coords?.latitude,
              lng: coords?.longitude,
              source: "gps",
            }),
          }).catch((err) => console.error("Auto-notify no listings error:", err));
        }
      }
    },
    [fetchListingsNear]
  );

  const allowLocation = useCallback(async () => {
    setPhase("locating");
    try {
      const gps = await requestGpsPosition();
      const { latitude, longitude } = gps.coords;
      coordsRef.current = { latitude, longitude };
      const res = await fetch(`/api/geo/reverse?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();
      const location = normalizeLocationInput(data);
      if (!hasLocation(location)) {
        setPhase("failed");
        return;
      }
      await showShops(location);
    } catch (err) {
      if (err?.code === 1) {
        setPhase("denied");
        return;
      }
      if (err?.code === 0) {
        toast.error("Location is not supported in this browser.");
      }
      setPhase("failed");
    }
  }, [showShops, toast]);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    async function init() {
      let permission = "prompt";
      try {
        if (typeof navigator !== "undefined" && navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: "geolocation" });
          permission = status.state;
        }
      } catch {
        permission = "prompt";
      }

      if (permission === "granted") {
        await allowLocation();
        return;
      }
      if (permission === "denied") {
        setPhase("denied");
        return;
      }
      setPhase("ask");
    }

    init();
  }, [allowLocation]);

  const locationLabel =
    [userLocation.city, userLocation.state].filter(Boolean).join(", ") ||
    (userLocation.zip ? `ZIP ${userLocation.zip}` : "your area");

  const browseAll = (
    <Link href={ALL_LISTINGS_HREF}>
      <Button variant="primary" size="lg">
        Browse all listings
      </Button>
    </Link>
  );

  return (
    <section className="py-8 sm:py-12">
      <div className={LISTINGS_PAGE_CONTAINER}>
        {phase === "checking" || phase === "locating" ? (
          <p className="py-16 text-center text-secondary">Finding repair shops near you…</p>
        ) : null}

        {phase === "ask" ? (
          <div className="mx-auto max-w-lg rounded-xl border border-border bg-card px-6 py-12 text-center shadow-sm">
            <FiMapPin className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-title">Allow location access</h1>
            <p className="mt-2 text-sm text-secondary">
              Allow location access so we can show repair shops near you.
            </p>
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="primary" size="lg" onClick={allowLocation}>
                Allow location access
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "denied" || phase === "failed" ? (
          <div className="mx-auto max-w-lg rounded-xl border border-border bg-card px-6 py-12 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-title">
              {phase === "denied" ? "Location access is blocked" : "We could not read your location"}
            </h1>
            <p className="mt-2 text-sm text-secondary">
              {phase === "denied"
                ? "Turn on location access for this site in your browser, then reload this page. You can also browse every repair shop."
                : "Browse every repair shop in the directory."}
            </p>
            <div className="mt-6 flex justify-center">{browseAll}</div>
          </div>
        ) : null}

        {phase === "results" ? (
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
            <h1 className="mb-6 text-2xl font-bold tracking-tight text-title sm:text-3xl">
              Repair shops near {locationLabel}
            </h1>
            {searching ? <p className="py-12 text-center text-secondary">Finding repair shops near you…</p> : null}
            {!searching && listings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
                <p className="font-medium text-title">No repair shops found near {locationLabel}</p>
                <p className="mt-2 text-sm text-secondary">Browse every repair shop in the directory.</p>
                <div className="mt-6 flex justify-center">{browseAll}</div>
              </div>
            ) : null}
            {!searching && listings.length > 0 ? (
              <>
                <p className="mb-6 text-sm text-secondary">
                  {listings.length} center{listings.length === 1 ? "" : "s"} near {locationLabel}
                </p>
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
              </>
            ) : null}
          </ListingsWithRepairFormLayout>
        ) : null}
      </div>
    </section>
  );
}
