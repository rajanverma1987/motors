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

function isoOrNull(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
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
    phase: o.phase || "",
    hz: o.hz || "",
    poles: o.poles || "",
    frame: o.frame || "",
    enclosure: o.enclosure || "",
    insulationClass: o.insulationClass || "",
    serviceFactor: o.serviceFactor || "",
    nemaDesign: o.nemaDesign || "",
    bearingDE: o.bearingDE || "",
    bearingODE: o.bearingODE || "",
    facilityLocation: o.facilityLocation || "",
    locationBuilding: o.locationBuilding || "",
    locationArea: o.locationArea || "",
    locationAssetTag: o.locationAssetTag || "",
    application: o.application || "",
    installDate: isoOrNull(o.installDate),
    criticality: o.criticality || "standard",
    status: o.status || "in_service",
    notes: o.notes || "",
    nameplatePhotoUrl: o.nameplatePhotoUrl || "",
    motorPhotoUrl: o.motorPhotoUrl || "",
    extraPhotoUrls: Array.isArray(o.extraPhotoUrls) ? o.extraPhotoUrls : [],
    documents: (Array.isArray(o.documents) ? o.documents : []).map((d) => ({
      id: d?._id != null ? String(d._id) : "",
      name: d?.name || "",
      url: d?.url || "",
      kind: d?.kind || "other",
      uploadedAt: isoOrNull(d?.uploadedAt),
    })),
    archived: Boolean(o.archived),
    lastMaintenanceAt: isoOrNull(o.lastMaintenanceAt),
    nextMaintenanceDue: isoOrNull(o.nextMaintenanceDue),
    openRfqId: o.openRfqId != null ? String(o.openRfqId) : "",
    currentShopName: o.currentShopName || "",
    currentShopListingId: o.currentShopListingId || "",
    datasheetVersion: Number(o.datasheetVersion) || 0,
    datasheetReviewFlag: o.datasheetReviewFlag || "",
    lifetimeRepairCount: Number(o.lifetimeRepairCount) || 0,
    lifetimeRepairCost: Number(o.lifetimeRepairCost) || 0,
    createdAt: isoOrNull(o.createdAt),
    updatedAt: isoOrNull(o.updatedAt),
  };
}

export function serializeTrackMaintenanceLog(doc) {
  const o = doc?.toObject?.() ?? doc ?? {};
  return {
    id: o._id != null ? String(o._id) : "",
    motorId: o.motorId != null ? String(o.motorId) : "",
    activityType: o.activityType || "other",
    performedAt: isoOrNull(o.performedAt),
    performedBy: o.performedBy || "",
    insulationResistanceMohm: o.insulationResistanceMohm || "",
    vibrationInPerSec: o.vibrationInPerSec || "",
    temperatureF: o.temperatureF || "",
    notes: o.notes || "",
    attachments: Array.isArray(o.attachments) ? o.attachments : [],
    nextDueAt: isoOrNull(o.nextDueAt),
    createdAt: isoOrNull(o.createdAt),
  };
}

export function serializeTrackServiceHistory(doc) {
  const o = doc?.toObject?.() ?? doc ?? {};
  return {
    id: o._id != null ? String(o._id) : "",
    motorId: o.motorId != null ? String(o.motorId) : "",
    completedAt: isoOrNull(o.completedAt),
    shopName: o.shopName || "",
    shopListingId: o.shopListingId || "",
    jobNumber: o.jobNumber || "",
    invoiceNumber: o.invoiceNumber || "",
    invoicedAt: isoOrNull(o.invoicedAt),
    workType: o.workType || "other",
    description: o.description || "",
    finalCost: o.finalCost === null || o.finalCost === undefined ? null : Number(o.finalCost),
    currency: o.currency || "USD",
    costSource: o.costSource || "",
    turnaroundDays:
      o.turnaroundDays === null || o.turnaroundDays === undefined ? null : Number(o.turnaroundDays),
    failureCause: o.failureCause || "",
    testReportUrl: o.testReportUrl || "",
    attachments: Array.isArray(o.attachments) ? o.attachments : [],
    warrantyMonths:
      o.warrantyMonths === null || o.warrantyMonths === undefined ? null : Number(o.warrantyMonths),
    warrantyExpiresAt: isoOrNull(o.warrantyExpiresAt),
    rfqRequestId: o.rfqRequestId != null ? String(o.rfqRequestId) : "",
    proposalId: o.proposalId || "",
    source: o.source || "manual",
    createdAt: isoOrNull(o.createdAt),
  };
}

export function serializeTrackDatasheetVersion(doc) {
  const o = doc?.toObject?.() ?? doc ?? {};
  return {
    id: o._id != null ? String(o._id) : "",
    version: Number(o.version) || 0,
    powerType: o.powerType || "AC",
    data: o.data || {},
    fieldProvenance: o.fieldProvenance || {},
    changedFields: Array.isArray(o.changedFields) ? o.changedFields : [],
    sourceType: o.sourceType || "facility",
    sourceLabel: o.sourceLabel || "",
    shopListingId: o.shopListingId || "",
    jobNumber: o.jobNumber || "",
    proposalId: o.proposalId || "",
    recordedAt: isoOrNull(o.recordedAt),
    note: o.note || "",
  };
}
