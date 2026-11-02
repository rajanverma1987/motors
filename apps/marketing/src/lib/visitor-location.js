import { normalizeLocationInput } from "@/lib/us-state-normalize";

const EMPTY = { city: "", state: "", zip: "", country: "" };

function isPublicIp(ip) {
  const s = String(ip || "").trim().toLowerCase();
  if (!s) return false;
  if (s === "::1" || s === "0.0.0.0") return false;
  if (s.startsWith("127.") || s.startsWith("10.") || s.startsWith("192.168.") || s.startsWith("169.254.")) {
    return false;
  }
  const v4 = /^172\.(\d+)\./.exec(s);
  if (v4) {
    const n = Number(v4[1]);
    if (n >= 16 && n <= 31) return false;
  }
  if (s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80")) return false;
  return true;
}

export function clientIpFromRequest(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const candidates = [
    ...forwarded.split(","),
    request.headers.get("x-real-ip") || "",
    request.headers.get("cf-connecting-ip") || "",
  ];
  for (const raw of candidates) {
    const ip = String(raw || "").trim();
    if (isPublicIp(ip)) return ip;
  }
  return "";
}

async function fetchJson(url, { timeoutMs = 8000, headers } = {}) {
  const res = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function pickComponent(components, type) {
  const row = (components || []).find((c) => Array.isArray(c.types) && c.types.includes(type));
  return row?.long_name || "";
}

async function reverseGeocodeGoogle(lat, lng) {
  const key = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);
  const data = await fetchJson(url.toString());
  const components = data?.results?.[0]?.address_components;
  if (!components) return null;
  const city =
    pickComponent(components, "locality") ||
    pickComponent(components, "postal_town") ||
    pickComponent(components, "sublocality") ||
    pickComponent(components, "administrative_area_level_2");
  const state = pickComponent(components, "administrative_area_level_1");
  const zip = pickComponent(components, "postal_code");
  const country = pickComponent(components, "country");
  const normalized = normalizeLocationInput({ city, state, zip });
  if (!normalized.city && !normalized.state && !normalized.zip) return null;
  return { ...normalized, country };
}

async function reverseGeocodeBigDataCloud(lat, lng) {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("localityLanguage", "en");
  const data = await fetchJson(url.toString());
  if (!data || data.status === 400) return null;
  const city = data.city || data.locality || data.localityInfo?.administrative?.[2]?.name || "";
  const state = data.principalSubdivision || "";
  const zip = data.postcode || "";
  const normalized = normalizeLocationInput({ city, state, zip });
  if (!normalized.city && !normalized.state && !normalized.zip) return null;
  return { ...normalized, country: data.countryName || "" };
}

async function reverseGeocodeCensus(lat, lng) {
  const censusUrl = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
  censusUrl.searchParams.set("x", String(lng));
  censusUrl.searchParams.set("y", String(lat));
  censusUrl.searchParams.set("benchmark", "Public_AR_Current");
  censusUrl.searchParams.set("vintage", "Current_Current");
  censusUrl.searchParams.set("format", "json");
  const data = await fetchJson(censusUrl.toString(), { timeoutMs: 10000 });
  const geographies = data?.result?.geographies || {};
  const places = geographies.Places || geographies["Incorporated Places"] || [];
  const counties = geographies.Counties || [];
  const states = geographies.States || [];
  const zctas =
    geographies["2020 Census ZIP Code Tabulation Areas"] ||
    geographies["ZIP Code Tabulation Areas"] ||
    [];
  const placeName = places[0]?.NAME || counties[0]?.NAME || "";
  const city = String(placeName).replace(/\s+(city|town|village|CDP)$/i, "").trim();
  const normalized = normalizeLocationInput({
    city,
    state: states[0]?.NAME || "",
    zip: zctas[0]?.ZCTA5 || zctas[0]?.GEOID || "",
  });
  if (!normalized.city && !normalized.state && !normalized.zip) return null;
  return { ...normalized, country: "United States" };
}

/**
 * City, state, and ZIP from coordinates.
 * Uses Google when GOOGLE_MAPS_API_KEY is set, then free HTTPS fallbacks.
 */
export async function reverseGeocode(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { ...EMPTY };
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return { ...EMPTY };

  const providers = [reverseGeocodeGoogle, reverseGeocodeBigDataCloud, reverseGeocodeCensus];
  for (const provider of providers) {
    try {
      const hit = await provider(latitude, longitude);
      if (hit) return hit;
    } catch (err) {
      console.warn("Reverse geocode provider failed:", err?.message || err);
    }
  }
  return { ...EMPTY };
}

async function ipGeolocateIpwho(ip) {
  const path = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/";
  const data = await fetchJson(path);
  if (!data || data.success === false) return null;
  const normalized = normalizeLocationInput({
    city: data.city,
    state: data.region,
    zip: data.postal,
  });
  if (!normalized.city && !normalized.state && !normalized.zip) return null;
  return { ...normalized, country: data.country || "" };
}

async function ipGeolocateIpapi(ip) {
  const path = ip ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` : "https://ipapi.co/json/";
  const data = await fetchJson(path, { headers: { Accept: "application/json" } });
  if (!data || data.error) return null;
  const normalized = normalizeLocationInput({
    city: data.city,
    state: data.region,
    zip: data.postal,
  });
  if (!normalized.city && !normalized.state && !normalized.zip) return null;
  return { ...normalized, country: data.country_name || "" };
}

/** Approximate city, state, and ZIP from a public IP. Empty IP uses the caller IP. */
export async function ipGeolocate(ip) {
  const publicIp = isPublicIp(ip) ? String(ip).trim() : "";
  const providers = [ipGeolocateIpwho, ipGeolocateIpapi];
  for (const provider of providers) {
    try {
      const hit = await provider(publicIp);
      if (hit) return hit;
    } catch (err) {
      console.warn("IP geolocation provider failed:", err?.message || err);
    }
  }
  return { ...EMPTY };
}
