/**
 * Server-side RFQ orchestration for IQMotorTrack (§7, §8).
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackDatasheetVersion from "@/models/TrackDatasheetVersion";
import TrackMotor from "@/models/TrackMotor";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import TrackServiceHistory from "@/models/TrackServiceHistory";
import { isTrackPro, TRACK_FREE_MOTOR_LIMIT } from "@/lib/track-subscription";
import { rankTrackShopsForMotor } from "@/lib/track-shop-matching";
import {
  buildTrackFacilitySnapshot,
  buildTrackMotorSnapshot,
  buildTrackServiceHistorySummary,
} from "@/lib/track-snapshot";
import { trackDatasheetProvenanceLine } from "@/lib/track-datasheet";
import { buildTrackRfqReference, trackMaxShopsPerRfq } from "@/lib/track-rfq";

/**
 * On the free plan only the 5 oldest active motors keep full functionality, so a
 * downgrade never silently deletes data but also never grants unlimited use (§10).
 *
 * @param {any} facility
 * @param {any} motor
 * @returns {Promise<boolean>}
 */
export async function isTrackMotorOverPlanLimit(facility, motor) {
  if (isTrackPro(facility)) return false;
  await connectDB();
  const olderCount = await TrackMotor.countDocuments({
    facilityId: facility._id,
    archived: { $ne: true },
    createdAt: { $lt: motor.createdAt },
  });
  return olderCount >= TRACK_FREE_MOTOR_LIMIT;
}

/**
 * Build the snapshot bundle sent with an RFQ (§7.4, §9.3).
 * @param {{ facility: any, motor: any, shareDatasheet: boolean, shareServiceHistory: boolean }} args
 */
export async function buildTrackRfqSnapshots({
  facility,
  motor,
  shareDatasheet,
  shareServiceHistory,
}) {
  await connectDB();
  const motorSnapshot = buildTrackMotorSnapshot(motor);
  const facilitySnapshot = buildTrackFacilitySnapshot(facility);

  let datasheetSnapshot = null;
  let datasheetSnapshotVersion = 0;
  let datasheetSnapshotProvenance = "";
  let datasheetSnapshotPowerType = "";
  if (shareDatasheet) {
    const latest = await TrackDatasheetVersion.findOne({
      motorId: motor._id,
      powerType: motor.powerType,
    })
      .sort({ version: -1 })
      .lean();
    if (latest) {
      datasheetSnapshot = latest.data || null;
      datasheetSnapshotVersion = Number(latest.version) || 0;
      datasheetSnapshotProvenance = trackDatasheetProvenanceLine(latest);
      datasheetSnapshotPowerType = String(latest.powerType || "").toUpperCase();
    }
  }

  let serviceHistorySummary = [];
  if (shareServiceHistory) {
    const rows = await TrackServiceHistory.find({ motorId: motor._id })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean();
    serviceHistorySummary = buildTrackServiceHistorySummary(rows);
  }

  return {
    motorSnapshot,
    facilitySnapshot,
    datasheetSnapshot,
    datasheetSnapshotVersion,
    datasheetSnapshotProvenance,
    datasheetSnapshotPowerType,
    serviceHistorySummary,
  };
}

/**
 * Resolve the chosen listing ids into invitation subdocuments, using the same
 * ranking metadata the selection screen showed.
 *
 * @param {{ facility: any, motor: any, listingIds: string[], urgency: string, logistics: string }} args
 */
export async function buildTrackInvitations({ facility, motor, listingIds, urgency, logistics }) {
  const wanted = [...new Set((listingIds || []).map((id) => String(id).trim()).filter(Boolean))];
  if (wanted.length === 0) return { invitations: [], error: "Select at least one shop." };

  const ranked = await rankTrackShopsForMotor({
    facility,
    motor,
    urgency,
    logistics,
    limit: 500,
  });
  const byId = new Map(ranked.map((shop) => [shop.id, shop]));

  const invitations = [];
  for (const id of wanted) {
    const shop = byId.get(id);
    if (!shop) {
      return { invitations: [], error: "One of the selected shops is no longer available. Refresh and pick again." };
    }
    invitations.push({
      listingId: shop.id,
      shopName: shop.companyName,
      shopCity: shop.city,
      shopState: shop.state,
      shopRating: shop.rating,
      distanceLabel: shop.distanceLabel,
      respondsBy: shop.respondsBy,
      servicedBefore: shop.servicedBefore,
      lastServicedAt: shop.lastServicedAt ? new Date(shop.lastServicedAt) : null,
      status: "invited",
      deliveryStatus: "pending",
      invitedAt: new Date(),
    });
  }
  return { invitations, error: "" };
}

/**
 * Enforce §16 D2: 5 shops per RFQ on Free, unlimited on Pro.
 * @param {any} facility
 * @param {number} totalShops
 */
export function trackShopLimitError(facility, totalShops) {
  const max = trackMaxShopsPerRfq(isTrackPro(facility));
  if (totalShops <= max) return "";
  return `The free plan allows up to ${max} shops per RFQ. Upgrade to Pro to invite more.`;
}

/**
 * Load an RFQ owned by this facility, with its motor.
 * @param {any} facility
 * @param {string} id
 */
export async function loadOwnedTrackRfq(facility, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { rfq: null, motor: null };
  await connectDB();
  const rfq = await TrackRfqRequest.findOne({ _id: id, facilityId: facility._id });
  if (!rfq) return { rfq: null, motor: null };
  const motor = await TrackMotor.findOne({ _id: rfq.motorId, facilityId: facility._id });
  return { rfq, motor };
}

/**
 * @param {any} rfq
 */
export function ensureTrackRfqReference(rfq) {
  if (!rfq.reference) rfq.reference = buildTrackRfqReference(rfq._id);
  return rfq.reference;
}
