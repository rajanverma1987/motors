import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { getBearerTokenFromRequest, verifyTrackToken } from "@/lib/auth-portal";
import {
  countActiveMotors,
  describeTrackAccess,
  ensureTrackBillingPlan,
  trackFacilityToJson,
} from "@/lib/track-subscription";

export async function getTrackFacilityFromRequest(request) {
  const token = getBearerTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyTrackToken(token);
  if (!payload?.facilityId) return null;
  await connectDB();
  const facility = await TrackFacility.findById(payload.facilityId);
  if (!facility || facility.canLogin === false) return null;
  if (String(facility.email).toLowerCase() !== payload.email) return null;
  return facility;
}

export function trackUnauthorized() {
  return { error: "Sign in required.", code: "AUTH_REQUIRED" };
}

export async function trackSessionPayload(facility) {
  const motorCount = await countActiveMotors(facility._id);
  const access = describeTrackAccess(facility, motorCount);
  const billing = await ensureTrackBillingPlan();
  return trackFacilityToJson(facility, access, billing);
}

export function serializeTrackMotor(doc) {
  const o = doc?.toObject?.() ?? doc ?? {};
  return {
    id: o._id != null ? String(o._id) : String(o.id || ""),
    facilityId: o.facilityId != null ? String(o.facilityId) : "",
    manufacturer: o.manufacturer || "",
    modelNumber: o.modelNumber || "",
    serialNumber: o.serialNumber || "",
    powerType: o.powerType || "AC",
    motorType: o.motorType || "",
    hp: o.hp || "",
    kw: o.kw || "",
    voltage: o.voltage || "",
    fullLoadAmps: o.fullLoadAmps || "",
    rpm: o.rpm || "",
    frame: o.frame || "",
    enclosure: o.enclosure || "",
    locationBuilding: o.locationBuilding || "",
    locationArea: o.locationArea || "",
    locationAssetTag: o.locationAssetTag || "",
    criticality: o.criticality || "standard",
    status: o.status || "in_service",
    notes: o.notes || "",
    nameplatePhotoUrl: o.nameplatePhotoUrl || "",
    motorPhotoUrl: o.motorPhotoUrl || "",
    archived: Boolean(o.archived),
    lastMaintenanceAt: o.lastMaintenanceAt || null,
    nextMaintenanceDue: o.nextMaintenanceDue || null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
  };
}
