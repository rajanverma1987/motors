import { randomBytes } from "crypto";
import UserSettings from "@/models/UserSettings";
import {
  normalizeTimeClockRadiusM,
  TIME_CLOCK_RADIUS_DEFAULT_M,
} from "@/lib/time-clock-geo";

export async function uniqueTimeClockToken(excludeOwnerEmail) {
  for (let i = 0; i < 8; i++) {
    const token = randomBytes(24).toString("hex");
    const clash = await UserSettings.findOne({
      "settings.timeClockToken": token,
      ...(excludeOwnerEmail ? { ownerEmail: { $ne: excludeOwnerEmail } } : {}),
    }).lean();
    if (!clash) return token;
  }
  return randomBytes(24).toString("hex");
}

/**
 * Ensure shop has a timeClockToken; return settings slice used by time clock.
 * @param {string} ownerEmail
 */
export async function ensureTimeClockSettings(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  let doc = await UserSettings.findOne({ ownerEmail: email });
  if (!doc) {
    const token = await uniqueTimeClockToken(null);
    doc = await UserSettings.create({
      ownerEmail: email,
      settings: {
        timeClockToken: token,
        timeClockLat: null,
        timeClockLng: null,
        timeClockRadiusM: TIME_CLOCK_RADIUS_DEFAULT_M,
      },
    });
  } else {
    const existing = doc.settings?.timeClockToken;
    if (!(typeof existing === "string" && existing.trim())) {
      const token = await uniqueTimeClockToken(email);
      await UserSettings.updateOne(
        { ownerEmail: email },
        {
          $set: {
            "settings.timeClockToken": token,
            "settings.timeClockRadiusM":
              doc.settings?.timeClockRadiusM ?? TIME_CLOCK_RADIUS_DEFAULT_M,
          },
        }
      );
      doc = await UserSettings.findOne({ ownerEmail: email });
    }
  }
  const s = doc?.settings || {};
  const lat = s.timeClockLat != null && s.timeClockLat !== "" ? Number(s.timeClockLat) : null;
  const lng = s.timeClockLng != null && s.timeClockLng !== "" ? Number(s.timeClockLng) : null;
  return {
    token: String(s.timeClockToken || "").trim(),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    radiusM: normalizeTimeClockRadiusM(s.timeClockRadiusM),
    shopName: "",
  };
}

export async function findShopByTimeClockToken(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  const doc = await UserSettings.findOne({ "settings.timeClockToken": t }).lean();
  if (!doc) return null;
  const s = doc.settings || {};
  const lat = s.timeClockLat != null && s.timeClockLat !== "" ? Number(s.timeClockLat) : null;
  const lng = s.timeClockLng != null && s.timeClockLng !== "" ? Number(s.timeClockLng) : null;
  return {
    ownerEmail: String(doc.ownerEmail || "").trim().toLowerCase(),
    token: t,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    radiusM: normalizeTimeClockRadiusM(s.timeClockRadiusM),
  };
}

export async function updateTimeClockGeofence(ownerEmail, { lat, lng, radiusM }) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  await ensureTimeClockSettings(email);
  const nextLat = Number(lat);
  const nextLng = Number(lng);
  if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
    throw new Error("Valid latitude and longitude are required.");
  }
  if (Math.abs(nextLat) > 90 || Math.abs(nextLng) > 180) {
    throw new Error("Invalid coordinates.");
  }
  await UserSettings.updateOne(
    { ownerEmail: email },
    {
      $set: {
        "settings.timeClockLat": nextLat,
        "settings.timeClockLng": nextLng,
        "settings.timeClockRadiusM": normalizeTimeClockRadiusM(radiusM),
      },
    }
  );
  return ensureTimeClockSettings(email);
}
