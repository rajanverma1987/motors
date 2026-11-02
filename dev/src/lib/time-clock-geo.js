/** Haversine distance in meters between two WGS84 points. */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const r = 6371000;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(Number(lat2) - Number(lat1));
  const Δλ = toRad(Number(lng2) - Number(lng1));
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const TIME_CLOCK_RADIUS_DEFAULT_M = 150;
export const TIME_CLOCK_RADIUS_MIN_M = 50;
export const TIME_CLOCK_RADIUS_MAX_M = 500;
export const TIME_CLOCK_MAX_ACCURACY_M = 500;

export function normalizeTimeClockRadiusM(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return TIME_CLOCK_RADIUS_DEFAULT_M;
  return Math.min(TIME_CLOCK_RADIUS_MAX_M, Math.max(TIME_CLOCK_RADIUS_MIN_M, Math.round(n)));
}

/**
 * @param {{ lat?: unknown, lng?: unknown, accuracy?: unknown }} coords
 * @param {{ lat: number, lng: number, radiusM: number }} fence
 * @returns {{ ok: true, distanceM: number, accuracyM: number } | { ok: false, error: string }}
 */
export function evaluatePunchGeofence(coords, fence) {
  const lat = Number(coords?.lat);
  const lng = Number(coords?.lng);
  const accuracyM = Number(coords?.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "Location is required to punch in or out." };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, error: "Invalid location." };
  }
  const shopLat = Number(fence?.lat);
  const shopLng = Number(fence?.lng);
  if (!Number.isFinite(shopLat) || !Number.isFinite(shopLng)) {
    return { ok: false, error: "Shop punch location is not configured." };
  }
  const radiusM = normalizeTimeClockRadiusM(fence?.radiusM);
  if (Number.isFinite(accuracyM) && accuracyM > TIME_CLOCK_MAX_ACCURACY_M) {
    return {
      ok: false,
      error: "Location accuracy is too low. Move outdoors or closer to the shop and try again.",
    };
  }
  const distanceM = distanceMeters(lat, lng, shopLat, shopLng);
  if (distanceM > radiusM) {
    return {
      ok: false,
      error: "You must be at the shop to punch in or out.",
      distanceM,
      accuracyM: Number.isFinite(accuracyM) ? accuracyM : null,
    };
  }
  return {
    ok: true,
    distanceM,
    accuracyM: Number.isFinite(accuracyM) ? accuracyM : null,
  };
}
