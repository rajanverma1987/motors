/**
 * IQMotorTrack <-> IQMotorBase integration (§9).
 *
 * Both products ship inside the same Next.js deployment, so delivery is an
 * in-process server-side write rather than an HTTP hop. The contract the spec
 * actually requires is still honoured end to end:
 *
 *   - every event is recorded in `TrackIntegrationEvent` before it is applied,
 *   - `idempotencyKey` is unique, so replaying an event never duplicates a Lead,
 *     proposal, datasheet version or history entry,
 *   - failures are retried with backoff and are visible to platform admin with a
 *     manual resend action,
 *   - no browser in either product writes to the other product's collections.
 */

import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import TrackDatasheetVersion from "@/models/TrackDatasheetVersion";
import TrackFacility from "@/models/TrackFacility";
import TrackIntegrationEvent from "@/models/TrackIntegrationEvent";
import TrackMotor from "@/models/TrackMotor";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import TrackServiceHistory from "@/models/TrackServiceHistory";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendToListingNotifyEmails } from "@/lib/listing-notify-emails";
import { maybeSendLeadPlatformNurtureEmail } from "@/lib/lead-nurture";
import {
  sendTrackAwardedToShop,
  sendTrackDeliveryFailureToAdmin,
  sendTrackFacilityNotification,
  sendTrackNotSelectedToShop,
  sendTrackRfqCancelledToShop,
  sendTrackRfqToShop,
  sendTrackRfqUpdatedToShop,
} from "@/lib/email";
import {
  TRACK_LOGISTICS_LABEL,
  TRACK_PRICE_BASIS_LABEL,
  TRACK_URGENCY_LABEL,
  trackFormatMoney,
  trackTurnaroundDays,
} from "@/lib/track-rfq";
import { mergeTrackDatasheet } from "@/lib/track-datasheet";
import { machineTypesMatch, resolveMachineType } from "@/lib/machine-types";
import { trackRespondsBy } from "@/lib/track-shop-accounts";

const MAX_DELIVERY_ATTEMPTS = 6;
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 720];
const EMAIL_TOKEN_TTL_DAYS = 21;

/* ------------------------------------------------------------------ *
 * Event log
 * ------------------------------------------------------------------ */

/**
 * Insert an event once. Returns `{ event, isNew }`; `isNew === false` means the
 * event was already received and MUST NOT be applied a second time (§10).
 *
 * @param {{
 *   eventType: string,
 *   direction: "track_to_base"|"base_to_track",
 *   idempotencyKey: string,
 *   payload?: Record<string, unknown>,
 *   facilityId?: string,
 *   rfqRequestId?: string,
 *   invitationId?: string,
 *   motorId?: string,
 *   listingId?: string,
 *   leadId?: string,
 *   proposalId?: string,
 * }} args
 */
export async function recordTrackEvent(args) {
  await connectDB();
  const key = String(args.idempotencyKey || "").trim();
  if (!key) throw new Error("Integration events require an idempotency key");
  try {
    const event = await TrackIntegrationEvent.create({
      eventType: args.eventType,
      direction: args.direction,
      idempotencyKey: key,
      status: "pending",
      payload: args.payload || {},
      facilityId: String(args.facilityId || ""),
      rfqRequestId: String(args.rfqRequestId || ""),
      invitationId: String(args.invitationId || ""),
      motorId: String(args.motorId || ""),
      listingId: String(args.listingId || ""),
      leadId: String(args.leadId || ""),
      proposalId: String(args.proposalId || ""),
    });
    return { event, isNew: true };
  } catch (err) {
    if (err?.code === 11000) {
      const event = await TrackIntegrationEvent.findOne({ idempotencyKey: key });
      return { event, isNew: false };
    }
    throw err;
  }
}

async function markEventDelivered(event, extra = {}) {
  if (!event) return;
  event.status = "delivered";
  event.deliveredAt = new Date();
  event.attempts = (Number(event.attempts) || 0) + 1;
  event.lastError = "";
  event.nextAttemptAt = null;
  if (extra.leadId) event.leadId = String(extra.leadId);
  if (extra.proposalId) event.proposalId = String(extra.proposalId);
  await event.save();
}

async function markEventFailed(event, error) {
  if (!event) return;
  const attempts = (Number(event.attempts) || 0) + 1;
  event.attempts = attempts;
  event.lastError = String(error?.message || error || "Delivery failed").slice(0, 1000);
  const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS;
  if (exhausted) {
    event.status = "failed";
    event.nextAttemptAt = null;
  } else {
    event.status = "pending";
    const minutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
    event.nextAttemptAt = new Date(Date.now() + minutes * 60000);
  }
  await event.save();
  if (exhausted) {
    // §11 - the platform admin hears about a delivery only once it is out of retries.
    try {
      await sendTrackDeliveryFailureToAdmin({
        eventType: String(event.eventType || ""),
        rfqRequestId: String(event.rfqRequestId || ""),
        listingId: String(event.listingId || ""),
        lastError: event.lastError,
        attempts,
      });
    } catch (err) {
      console.warn("Track admin failure alert failed:", err?.message || err);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function siteBase() {
  return String(getPublicSiteUrl() || "").replace(/\/+$/, "");
}

function motorSummaryLine(snapshot) {
  const src = snapshot || {};
  const rating = src.hp ? `${src.hp} HP` : src.kw ? `${src.kw} kW` : "";
  return [src.manufacturer, rating, src.voltage, src.powerType, src.serialNumber ? `S/N ${src.serialNumber}` : ""]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function dateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}

export function createTrackEmailToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashTrackEmailToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function shopResponseUrl(rfqId, invitationId, token) {
  return `${siteBase()}/Track/shop-response/${rfqId}/${invitationId}?token=${encodeURIComponent(token)}`;
}

function simpleLeadUrl() {
  return `${siteBase()}/dashboards?tab=customers&filter=Lead&leadSource=track`;
}

function simpleProposalUrl(proposalId) {
  const base = `${siteBase()}/dashboards?tab=service-proposals`;
  return proposalId ? `${base}&proposalId=${encodeURIComponent(proposalId)}` : base;
}

/* ------------------------------------------------------------------ *
 * E1 - RFQ sent to shop -> creates one Lead per invited shop (§9.3)
 * ------------------------------------------------------------------ */

function leadPayloadForInvitation({ rfq, invitation, facility, motorSnapshot }) {
  const fac = rfq.facilitySnapshot || {};
  const cityParts = [fac.city, fac.state].map((v) => String(v || "").trim()).filter(Boolean);
  return {
    name: String(fac.contactName || facility?.contactName || "Plant contact"),
    email: String(fac.email || facility?.email || ""),
    phone: String(fac.phone || facility?.phone || ""),
    company: String(fac.facilityName || facility?.facilityName || ""),
    city: cityParts.join(", "),
    zipCode: String(fac.postalCode || ""),
    // Flat fields stay populated so existing Lead lists, filters and exports keep working (§9.3).
    motorType: String(motorSnapshot.motorType || motorSnapshot.powerType || ""),
    motorHp: String(motorSnapshot.hp || motorSnapshot.kw || ""),
    voltage: String(motorSnapshot.voltage || ""),
    problemDescription: String(rfq.failureDescription || ""),
    urgencyLevel: String(rfq.urgency === "emergency" ? "Emergency" : "Standard"),
    motorPhotos: [...(Array.isArray(rfq.failurePhotos) ? rfq.failurePhotos : []), ...(motorSnapshot.photos || [])].slice(
      0,
      20
    ),
    message: `Motor down RFQ from IQMotorTrack. ${motorSummaryLine(motorSnapshot)}`.slice(0, 2000),
    sourceListingId: String(invitation.listingId || ""),
    assignedListingIds: [String(invitation.listingId || "")].filter(Boolean),
    leadSource: "iqmotortrack",
    leadType: "repair_request",
    status: "new",
    trackFacilityId: String(rfq.facilityId || ""),
    trackRfqRequestId: String(rfq._id),
    trackInvitationId: String(invitation._id),
    trackMotorId: String(rfq.motorId || ""),
    trackMotorSnapshot: motorSnapshot,
    trackDatasheetSnapshot: rfq.shareDatasheet ? rfq.datasheetSnapshot || null : null,
    trackDatasheetProvenance: rfq.shareDatasheet ? String(rfq.datasheetSnapshotProvenance || "") : "",
    trackDatasheetPowerType: rfq.shareDatasheet ? String(rfq.datasheetSnapshotPowerType || "") : "",
    trackServiceHistorySummary: rfq.shareServiceHistory ? rfq.serviceHistorySummary || [] : [],
    trackInvitedShopCount: (rfq.invitations || []).length,
    trackLogistics: String(rfq.logistics || ""),
    trackNeededBackBy: rfq.neededBackBy || null,
    trackBudgetLimit: rfq.shareBudget ? rfq.budgetLimit ?? null : null,
    trackFacilityName: String(fac.facilityName || ""),
    trackFacilityAddress: String(fac.address || ""),
    trackFacilityState: String(fac.state || ""),
    trackFacilityCountry: String(fac.country || ""),
  };
}

/**
 * Deliver one Shop Invitation. Idempotent: a second call reuses the existing Lead.
 *
 * @param {{ rfq: any, invitation: any, facility: any }} args
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function deliverTrackInvitation({ rfq, invitation, facility }) {
  await connectDB();
  const invitationId = String(invitation._id);
  const { event, isNew } = await recordTrackEvent({
    eventType: "rfq_sent",
    direction: "track_to_base",
    idempotencyKey: `rfq_sent:${invitationId}`,
    facilityId: String(rfq.facilityId || ""),
    rfqRequestId: String(rfq._id),
    invitationId,
    motorId: String(rfq.motorId || ""),
    listingId: String(invitation.listingId || ""),
    payload: { invitedShopCount: (rfq.invitations || []).length },
  });

  if (!isNew && event?.status === "delivered") {
    return { ok: true };
  }

  invitation.deliveryAttempts = (Number(invitation.deliveryAttempts) || 0) + 1;
  invitation.lastAttemptAt = new Date();

  try {
    const listing = await Listing.findOne({ _id: invitation.listingId, status: "approved" })
      .select("companyName city state email notificationEmails crmUserId primaryContactPerson")
      .lean();
    if (!listing) {
      throw new Error("Shop listing is no longer available. Pick another shop.");
    }

    const motorSnapshot = rfq.motorSnapshot || {};
    let lead = await Lead.findOne({ trackInvitationId: invitationId });
    if (!lead) {
      lead = await Lead.create(leadPayloadForInvitation({ rfq, invitation, facility, motorSnapshot }));
    }
    invitation.leadId = String(lead._id);

    const respondsBy = await trackRespondsBy({ ...listing, _id: invitation.listingId });
    invitation.respondsBy = respondsBy;

    let actionUrl = simpleLeadUrl();
    let actionLabel = "Open the RFQ in your dashboard";
    if (respondsBy === "email") {
      // Only the hash is stored, so each delivery attempt mints a fresh single-use link.
      const plainToken = createTrackEmailToken();
      invitation.emailToken = hashTrackEmailToken(plainToken);
      invitation.emailTokenExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_DAYS * 86400000);
      invitation.emailTokenUsedAt = null;
      actionUrl = shopResponseUrl(String(rfq._id), invitationId, plainToken);
      actionLabel = "View the motor and respond";
    }

    const notify = await sendToListingNotifyEmails(listing, (to) =>
      sendTrackRfqToShop({
        to,
        listingCompanyName: listing.companyName || "",
        facilityName: rfq.facilitySnapshot?.facilityName || facility?.facilityName || "",
        facilityCity: [rfq.facilitySnapshot?.city, rfq.facilitySnapshot?.state].filter(Boolean).join(", "),
        motorSummary: motorSummaryLine(motorSnapshot),
        urgencyLabel: TRACK_URGENCY_LABEL[rfq.urgency] || "Standard",
        isEmergency: rfq.urgency === "emergency",
        failureDescription: rfq.failureDescription || "",
        logisticsLabel: TRACK_LOGISTICS_LABEL[rfq.logistics] || "",
        neededBackBy: dateLabel(rfq.neededBackBy),
        invitedShopCount: (rfq.invitations || []).length,
        actionUrl,
        actionLabel,
        respondsBy,
      })
    );

    invitation.notifiedByEmail = notify.sent.length > 0;
    // An in-app shop has the Lead in its dashboard even when SMTP is unavailable.
    if (respondsBy === "email" && notify.sent.length === 0) {
      throw new Error("Could not email this shop. It has no working notification address.");
    }

    if (notify.sent.length > 0 || respondsBy === "in_app") {
      try {
        await maybeSendLeadPlatformNurtureEmail({
          listing,
          siteUrl: getPublicSiteUrl(),
          source: "iqmotortrack",
        });
      } catch (e) {
        console.warn("Track lead nurture email skipped:", e?.message || e);
      }
    }

    invitation.deliveryStatus = "sent";
    invitation.deliveryError = "";
    invitation.deliveredAt = new Date();
    await markEventDelivered(event, { leadId: invitation.leadId });
    return { ok: true };
  } catch (err) {
    invitation.deliveryStatus = "failed";
    invitation.deliveryError = String(err?.message || "Delivery failed").slice(0, 500);
    await markEventFailed(event, err);
    return { ok: false, error: invitation.deliveryError };
  }
}

/**
 * Deliver every pending invitation on an RFQ, then persist the RFQ once.
 * @param {any} rfq
 * @param {{ facility: any, invitationIds?: string[] }} args
 */
export async function deliverTrackRfq(rfq, { facility, invitationIds = null }) {
  const targets = (rfq.invitations || []).filter((inv) => {
    if (invitationIds && !invitationIds.includes(String(inv._id))) return false;
    return inv.deliveryStatus !== "sent";
  });
  const results = [];
  for (const invitation of targets) {
    const result = await deliverTrackInvitation({ rfq, invitation, facility });
    results.push({ invitationId: String(invitation._id), ...result });
  }
  await rfq.save();
  return results;
}

/**
 * Retry queued deliveries (cron / admin resend). Never duplicates a Lead.
 * @param {{ limit?: number }} [args]
 */
export async function retryTrackPendingDeliveries({ limit = 25 } = {}) {
  await connectDB();
  const now = new Date();
  const events = await TrackIntegrationEvent.find({
    eventType: "rfq_sent",
    status: "pending",
    attempts: { $gt: 0 },
    $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
  })
    .sort({ createdAt: 1 })
    .limit(Math.max(1, Number(limit) || 25));

  const out = [];
  for (const event of events) {
    const rfq = await TrackRfqRequest.findById(event.rfqRequestId);
    if (!rfq) {
      event.status = "skipped";
      await event.save();
      continue;
    }
    const invitation = rfq.invitations.id(event.invitationId);
    if (!invitation) {
      event.status = "skipped";
      await event.save();
      continue;
    }
    const facility = await TrackFacility.findById(rfq.facilityId);
    const result = await deliverTrackInvitation({ rfq, invitation, facility });
    await rfq.save();
    out.push({ eventId: String(event._id), ...result });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * E2 / E3 / E9 / E10 - Track -> Base
 * ------------------------------------------------------------------ */

async function listingForInvitation(invitation) {
  if (!invitation?.listingId || !mongoose.isValidObjectId(invitation.listingId)) return null;
  return Listing.findById(invitation.listingId)
    .select("companyName email notificationEmails crmUserId")
    .lean();
}

/** E2 - failure details or photos were added to an open RFQ. */
export async function emitTrackRfqUpdated(rfq, { note }) {
  const index = (rfq.updateNotes || []).length;
  for (const invitation of rfq.invitations || []) {
    if (["cancelled", "not_selected", "declined"].includes(invitation.status)) continue;
    const { event, isNew } = await recordTrackEvent({
      eventType: "rfq_updated",
      direction: "track_to_base",
      idempotencyKey: `rfq_updated:${invitation._id}:${index}`,
      rfqRequestId: String(rfq._id),
      invitationId: String(invitation._id),
      listingId: String(invitation.listingId || ""),
      leadId: String(invitation.leadId || ""),
      payload: { note },
    });
    if (!isNew && event?.status === "delivered") continue;
    try {
      if (invitation.leadId) {
        await Lead.findByIdAndUpdate(invitation.leadId, {
          $set: {
            problemDescription: String(rfq.failureDescription || ""),
            motorPhotos: [
              ...(Array.isArray(rfq.failurePhotos) ? rfq.failurePhotos : []),
              ...((rfq.motorSnapshot || {}).photos || []),
            ].slice(0, 20),
          },
        });
      }
      const listing = await listingForInvitation(invitation);
      if (listing) {
        await sendToListingNotifyEmails(listing, (to) =>
          sendTrackRfqUpdatedToShop({
            to,
            facilityName: rfq.facilitySnapshot?.facilityName || "",
            motorSummary: motorSummaryLine(rfq.motorSnapshot),
            note,
            actionUrl: invitation.respondsBy === "in_app" ? simpleLeadUrl() : siteBase(),
          })
        );
      }
      await markEventDelivered(event);
    } catch (err) {
      await markEventFailed(event, err);
    }
  }
}

/** E3 - the plant cancelled the RFQ. Every invited shop is told (§7.6). */
export async function emitTrackRfqCancelled(rfq, { reason }) {
  for (const invitation of rfq.invitations || []) {
    const { event, isNew } = await recordTrackEvent({
      eventType: "rfq_cancelled",
      direction: "track_to_base",
      idempotencyKey: `rfq_cancelled:${invitation._id}`,
      rfqRequestId: String(rfq._id),
      invitationId: String(invitation._id),
      listingId: String(invitation.listingId || ""),
      leadId: String(invitation.leadId || ""),
      payload: { reason },
    });
    if (!isNew && event?.status === "delivered") continue;
    try {
      if (invitation.leadId) {
        await Lead.findByIdAndUpdate(invitation.leadId, {
          $set: { status: "lost", lostReason: "Cancelled by customer" },
        });
      }
      const listing = await listingForInvitation(invitation);
      if (listing) {
        await sendToListingNotifyEmails(listing, (to) =>
          sendTrackRfqCancelledToShop({
            to,
            facilityName: rfq.facilitySnapshot?.facilityName || "",
            motorSummary: motorSummaryLine(rfq.motorSnapshot),
            reason,
          })
        );
      }
      await markEventDelivered(event);
    } catch (err) {
      await markEventFailed(event, err);
    }
  }
}

/** E9 - award. E10 - everyone else. Losing shops never learn the winner or the price (§8.3). */
export async function emitTrackAwardOutcomes(rfq) {
  const awardedId = String(rfq.awardedInvitationId || "");
  for (const invitation of rfq.invitations || []) {
    const isWinner = String(invitation._id) === awardedId;
    const eventType = isWinner ? "awarded" : "not_selected";
    const { event, isNew } = await recordTrackEvent({
      eventType,
      direction: "track_to_base",
      idempotencyKey: `${eventType}:${invitation._id}`,
      rfqRequestId: String(rfq._id),
      invitationId: String(invitation._id),
      listingId: String(invitation.listingId || ""),
      leadId: String(invitation.leadId || ""),
      proposalId: String(invitation.proposalId || ""),
      payload: {},
    });
    if (!isNew && event?.status === "delivered") continue;
    try {
      if (invitation.leadId) {
        await Lead.findByIdAndUpdate(invitation.leadId, {
          $set: isWinner
            ? { status: "won", lostReason: "", trackAwardedAt: rfq.awardedAt || new Date() }
            : {
                status: "lost",
                lostReason: invitation.response ? "Awarded to another shop" : "RFQ closed by customer",
              },
        });
      }
      const listing = await listingForInvitation(invitation);
      if (listing) {
        const response = invitation.response;
        await sendToListingNotifyEmails(listing, (to) =>
          isWinner
            ? sendTrackAwardedToShop({
                to,
                facilityName: rfq.facilitySnapshot?.facilityName || "",
                motorSummary: motorSummaryLine(rfq.motorSnapshot),
                totalPriceLabel: response
                  ? `${trackFormatMoney(response.totalPrice, response.currency)} (${
                      TRACK_PRICE_BASIS_LABEL[response.priceBasis] || response.priceBasis
                    })`
                  : "",
                turnaroundLabel: response?.turnaroundDays ? `${response.turnaroundDays} working days` : "",
                actionUrl: simpleProposalUrl(invitation.proposalId),
              })
            : sendTrackNotSelectedToShop({
                to,
                facilityName: rfq.facilitySnapshot?.facilityName || "",
                motorSummary: motorSummaryLine(rfq.motorSnapshot),
                responded: Boolean(invitation.response),
              })
        );
      }
      await markEventDelivered(event);
    } catch (err) {
      await markEventFailed(event, err);
    }
  }
}

/**
 * Un-awarding (§16 D5) drops the recorded award outcomes so a later award notifies
 * every shop again instead of being skipped as a duplicate.
 * @param {string} rfqRequestId
 */
export async function clearTrackAwardOutcomeEvents(rfqRequestId) {
  await connectDB();
  await TrackIntegrationEvent.deleteMany({
    rfqRequestId: String(rfqRequestId),
    eventType: { $in: ["awarded", "not_selected"] },
  });
}

/* ------------------------------------------------------------------ *
 * Facility notifications (§11)
 * ------------------------------------------------------------------ */

async function notifyFacility(rfq, { headline, rows = [], bodyNote = "" }) {
  try {
    const facility = await TrackFacility.findById(rfq.facilityId).select("email contactName").lean();
    if (!facility?.email) return;
    await sendTrackFacilityNotification({
      to: facility.email,
      headline,
      motorSummary: motorSummaryLine(rfq.motorSnapshot),
      rows,
      bodyNote,
      actionUrl: `${siteBase()}/Track`,
      actionLabel: "Open IQMotorTrack",
    });
  } catch (err) {
    console.warn("Track facility notification failed:", err?.message || err);
  }
}

/* ------------------------------------------------------------------ *
 * Base -> Track inbound appliers
 * ------------------------------------------------------------------ */

async function loadInvitationByLead(lead) {
  if (!lead?.trackRfqRequestId || !mongoose.isValidObjectId(lead.trackRfqRequestId)) return null;
  const rfq = await TrackRfqRequest.findById(lead.trackRfqRequestId);
  if (!rfq) return null;
  const invitation = rfq.invitations.id(lead.trackInvitationId);
  if (!invitation) return null;
  return { rfq, invitation };
}

/** E4 - the shop opened the Lead for the first time. */
export async function applyTrackLeadViewed(lead) {
  const found = await loadInvitationByLead(lead);
  if (!found) return;
  const { rfq, invitation } = found;
  if (invitation.viewedAt) return;
  const { event, isNew } = await recordTrackEvent({
    eventType: "lead_viewed",
    direction: "base_to_track",
    idempotencyKey: `lead_viewed:${invitation._id}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    leadId: String(lead._id),
  });
  if (!isNew) return;
  invitation.viewedAt = new Date();
  if (invitation.status === "invited") invitation.status = "viewed";
  await rfq.save();
  await markEventDelivered(event);
}

/** E5 - the shop converted the Lead into a Service Proposal. */
export async function applyTrackConvertedToProposal(lead, proposalId) {
  const found = await loadInvitationByLead(lead);
  if (!found) return;
  const { rfq, invitation } = found;
  const { event, isNew } = await recordTrackEvent({
    eventType: "converted_to_proposal",
    direction: "base_to_track",
    idempotencyKey: `converted:${invitation._id}:${proposalId}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    leadId: String(lead._id),
    proposalId: String(proposalId || ""),
  });
  if (!isNew) return;
  invitation.proposalId = String(proposalId || "");
  if (["invited", "viewed"].includes(invitation.status)) invitation.status = "preparing";
  if (!invitation.viewedAt) invitation.viewedAt = new Date();
  await rfq.save();
  await markEventDelivered(event);
}

/**
 * E6 / E7 - the shop sent (or revised) its Proposal Response.
 * @param {any} lead
 * @param {Record<string, unknown>} response
 */
export async function applyTrackProposalSent(lead, response) {
  const found = await loadInvitationByLead(lead);
  if (!found) throw new Error("This RFQ is no longer open in IQMotorTrack.");
  const { rfq, invitation } = found;
  if (["cancelled"].includes(rfq.status)) {
    throw new Error("The plant cancelled this RFQ.");
  }

  const nextVersion = invitation.response ? Number(invitation.response.version || 1) + 1 : 1;
  const isRevision = nextVersion > 1;
  const { event, isNew } = await recordTrackEvent({
    eventType: isRevision ? "proposal_revised" : "proposal_sent",
    direction: "base_to_track",
    idempotencyKey: `${isRevision ? "proposal_revised" : "proposal_sent"}:${invitation._id}:${nextVersion}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    leadId: String(lead._id),
    proposalId: String(response.proposalId || invitation.proposalId || ""),
    payload: response,
  });
  if (!isNew) return { ok: true, duplicate: true };

  if (invitation.response) {
    invitation.responseVersions.push(invitation.response);
  }
  invitation.response = { ...response, version: nextVersion, receivedAt: new Date() };
  invitation.status = "proposal_received";
  if (response.proposalId) invitation.proposalId = String(response.proposalId);
  await rfq.save();

  await Lead.findByIdAndUpdate(lead._id, {
    $set: { status: "quoted", trackProposalSentAt: new Date() },
  });

  const responded = (rfq.invitations || []).filter((i) => i.response || i.status === "declined").length;
  const allResponded = responded >= (rfq.invitations || []).length;
  await notifyFacility(rfq, {
    headline: isRevision
      ? `${invitation.shopName || "A shop"} revised its proposal`
      : `${invitation.shopName || "A shop"} sent a proposal`,
    rows: [
      ["Total", trackFormatMoney(response.totalPrice, response.currency)],
      ["Price basis", TRACK_PRICE_BASIS_LABEL[response.priceBasis] || ""],
      ["Turnaround", response.turnaroundDays ? `${response.turnaroundDays} working days` : ""],
      ["Valid until", dateLabel(response.validUntil)],
      ["Proposals received", `${rfq.invitations.filter((i) => i.response).length} of ${rfq.invitations.length}`],
    ],
    bodyNote: allResponded
      ? "Every invited shop has now responded. Open the comparison view to award the job."
      : rfq.urgency === "emergency"
        ? "This is an emergency RFQ. Compare and award as soon as you can."
        : "",
  });

  await markEventDelivered(event);
  return { ok: true, version: nextVersion };
}

/** E8 - the shop declined to quote, with a reason. */
export async function applyTrackDeclinedToQuote(lead, reason) {
  const found = await loadInvitationByLead(lead);
  if (!found) return;
  const { rfq, invitation } = found;
  const { event, isNew } = await recordTrackEvent({
    eventType: "declined_to_quote",
    direction: "base_to_track",
    idempotencyKey: `declined:${invitation._id}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    leadId: String(lead._id),
    payload: { reason },
  });
  if (!isNew) return;
  invitation.status = "declined";
  invitation.declineReason = String(reason || "").slice(0, 500);
  await rfq.save();
  await Lead.findByIdAndUpdate(lead._id, {
    $set: { status: "lost", declineReason: invitation.declineReason, lostReason: "Declined to quote" },
  });
  await notifyFacility(rfq, {
    headline: `${invitation.shopName || "A shop"} declined to quote`,
    rows: [["Reason", invitation.declineReason]],
  });
  await markEventDelivered(event);
}

/**
 * E11 - datasheet write-back (§9.8). Per decision D3 only the awarded shop writes back.
 *
 * @param {{
 *   proposalId: string,
 *   invitationId?: string,
 *   rfqRequestId?: string,
 *   shopName: string,
 *   listingId?: string,
 *   jobNumber?: string,
 *   powerType: "AC"|"DC",
 *   datasheet: Record<string, unknown>,
 *   revision?: string,
 * }} args
 */
export async function applyTrackDatasheetWriteBack({
  proposalId,
  invitationId = "",
  rfqRequestId = "",
  shopName,
  listingId = "",
  jobNumber = "",
  powerType,
  datasheet,
  revision = "",
}) {
  await connectDB();
  let rfq = null;
  if (rfqRequestId && mongoose.isValidObjectId(rfqRequestId)) {
    rfq = await TrackRfqRequest.findById(rfqRequestId);
  }
  if (!rfq && proposalId) {
    rfq = await TrackRfqRequest.findOne({ "invitations.proposalId": String(proposalId) });
  }
  if (!rfq) return { ok: false, reason: "no_linked_rfq" };

  const invitation = invitationId
    ? rfq.invitations.id(invitationId)
    : (rfq.invitations || []).find((i) => String(i.proposalId) === String(proposalId));
  if (!invitation) return { ok: false, reason: "no_invitation" };

  // D3: awarded shop only.
  if (String(rfq.awardedInvitationId || "") !== String(invitation._id)) {
    return { ok: false, reason: "not_awarded_shop" };
  }

  const motor = await TrackMotor.findById(rfq.motorId);
  if (!motor) return { ok: false, reason: "no_motor" };

  const incomingPowerType = resolveMachineType(powerType, "AC");
  const key = `datasheet_saved:${invitation._id}:${revision || crypto
    .createHash("sha1")
    .update(JSON.stringify(datasheet || {}))
    .digest("hex")}`;
  const { event, isNew } = await recordTrackEvent({
    eventType: "datasheet_saved",
    direction: "base_to_track",
    idempotencyKey: key,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    motorId: String(motor._id),
    listingId,
    proposalId: String(proposalId || ""),
    payload: { powerType: incomingPowerType },
  });
  if (!isNew) return { ok: true, duplicate: true };

  try {
    // Power type conflict: store the version and flag for facility review, never
    // silently change the motor's power type (§9.8).
    const conflict = !machineTypesMatch(incomingPowerType, motor.powerType || "AC");

    const latest = await TrackDatasheetVersion.findOne({ motorId: motor._id, powerType: incomingPowerType })
      .sort({ version: -1 })
      .lean();

    const merged = mergeTrackDatasheet({
      current: latest?.data || null,
      currentProvenance: latest?.fieldProvenance || {},
      incoming: datasheet,
      powerType: incomingPowerType,
      sourceType: "shop",
      sourceLabel: shopName || "Shop",
      jobNumber,
      at: new Date(),
    });

    if (!merged.changed && latest) {
      // Nothing new, but confirming sources still deserve to be recorded.
      await TrackDatasheetVersion.updateOne(
        { _id: latest._id },
        { $set: { fieldProvenance: merged.fieldProvenance } }
      );
      await markEventDelivered(event);
      return { ok: true, changed: false };
    }

    const highest = await TrackDatasheetVersion.findOne({ motorId: motor._id })
      .sort({ version: -1 })
      .select("version")
      .lean();
    const nextVersion = (Number(highest?.version) || 0) + 1;

    await TrackDatasheetVersion.create({
      facilityId: motor.facilityId,
      motorId: motor._id,
      version: nextVersion,
      powerType: incomingPowerType,
      data: merged.data,
      fieldProvenance: merged.fieldProvenance,
      changedFields: merged.changedFields,
      sourceType: "shop",
      sourceLabel: shopName || "Shop",
      shopListingId: listingId,
      jobNumber,
      proposalId: String(proposalId || ""),
      rfqRequestId: rfq._id,
      recordedAt: new Date(),
      note: conflict
        ? `Machine type on the shop datasheet (${incomingPowerType}) differs from the motor record (${resolveMachineType(motor.powerType, "AC")}).`
        : "",
    });

    motor.datasheetVersion = nextVersion;
    if (conflict) {
      motor.datasheetReviewFlag = `A ${incomingPowerType} datasheet was recorded by ${
        shopName || "a shop"
      }, but this motor is registered as ${motor.powerType}. Please review.`;
    }
    await motor.save();

    await notifyFacility(rfq, {
      headline: `Datasheet updated by ${shopName || "the shop"}${jobNumber ? ` from Job ${jobNumber}` : ""}`,
      rows: [["Fields updated", String(merged.changedFields.length)]],
    });

    await markEventDelivered(event);
    return { ok: true, changed: true, version: nextVersion };
  } catch (err) {
    await markEventFailed(event, err);
    return { ok: false, reason: err?.message || "write_back_failed" };
  }
}

/** E12 - the linked proposal became a JOB, or the job status changed (§9.10). */
export async function applyTrackJobStatusChanged({ proposalId, jobStatus, recordType, jobNumber }) {
  await connectDB();
  const rfq = await TrackRfqRequest.findOne({ "invitations.proposalId": String(proposalId) });
  if (!rfq) return { ok: false };
  const invitation = (rfq.invitations || []).find((i) => String(i.proposalId) === String(proposalId));
  if (!invitation || String(rfq.awardedInvitationId) !== String(invitation._id)) return { ok: false };

  const { event, isNew } = await recordTrackEvent({
    eventType: "job_status_changed",
    direction: "base_to_track",
    idempotencyKey: `job_status:${invitation._id}:${recordType || ""}:${jobStatus || ""}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    motorId: String(rfq.motorId || ""),
    proposalId: String(proposalId),
    payload: { jobStatus, recordType, jobNumber },
  });
  if (!isNew) return { ok: true, duplicate: true };

  if (String(recordType || "").toUpperCase() === "JOB" && rfq.status === "awarded") {
    rfq.status = "in_repair";
    rfq.jobStartedAt = new Date();
    await TrackMotor.findByIdAndUpdate(rfq.motorId, {
      $set: {
        status: "under_repair",
        currentShopName: invitation.shopName || "",
        currentShopListingId: invitation.listingId || "",
      },
    });
  }
  await rfq.save();
  await notifyFacility(rfq, {
    headline: `${invitation.shopName || "The shop"} updated the job status`,
    rows: [
      ["Job number", jobNumber || ""],
      ["Status", jobStatus || recordType || ""],
    ],
  });
  await markEventDelivered(event);
  return { ok: true };
}

/**
 * E13 - job completed. Creates the service history entry so history is never
 * missing just because billing is slow (§9.10).
 */
export async function applyTrackJobCompleted({ proposalId, jobNumber, description, failureCause, workType }) {
  await connectDB();
  const rfq = await TrackRfqRequest.findOne({ "invitations.proposalId": String(proposalId) });
  if (!rfq) return { ok: false };
  const invitation = (rfq.invitations || []).find((i) => String(i.proposalId) === String(proposalId));
  if (!invitation || String(rfq.awardedInvitationId) !== String(invitation._id)) return { ok: false };

  const { event, isNew } = await recordTrackEvent({
    eventType: "job_completed",
    direction: "base_to_track",
    idempotencyKey: `job_completed:${invitation._id}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    motorId: String(rfq.motorId || ""),
    proposalId: String(proposalId),
    payload: { jobNumber },
  });
  if (!isNew) return { ok: true, duplicate: true };

  const completedAt = new Date();
  const awardedPrice = invitation.response?.totalPrice ?? null;
  const existing = await TrackServiceHistory.findOne({
    rfqRequestId: rfq._id,
    proposalId: String(proposalId),
  });
  const payload = {
    facilityId: rfq.facilityId,
    motorId: rfq.motorId,
    completedAt,
    shopName: invitation.shopName || "",
    shopListingId: invitation.listingId || "",
    jobNumber: String(jobNumber || ""),
    workType: String(workType || "other"),
    description: String(description || invitation.response?.scopeSummary || ""),
    failureCause: String(failureCause || ""),
    finalCost: awardedPrice,
    currency: invitation.response?.currency || "USD",
    costSource: awardedPrice === null ? "" : "awarded_proposal",
    turnaroundDays: trackTurnaroundDays(rfq.sentAt, completedAt),
    warrantyMonths: invitation.response?.warrantyMonths ?? null,
    rfqRequestId: rfq._id,
    proposalId: String(proposalId),
    source: "iqmotorbase",
  };
  if (payload.warrantyMonths) {
    const expiry = new Date(completedAt);
    expiry.setMonth(expiry.getMonth() + Number(payload.warrantyMonths));
    payload.warrantyExpiresAt = expiry;
  }
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
  } else {
    await TrackServiceHistory.create(payload);
  }

  rfq.status = "repaired";
  rfq.jobCompletedAt = completedAt;
  await rfq.save();
  await TrackMotor.findByIdAndUpdate(rfq.motorId, { $set: { status: "repaired" } });
  await recalcTrackMotorRepairTotals(rfq.motorId);

  await notifyFacility(rfq, {
    headline: `${invitation.shopName || "The shop"} completed the job`,
    rows: [["Job number", jobNumber || ""]],
    bodyNote: "Confirm the motor is back in service in IQMotorTrack to close this RFQ.",
  });
  await markEventDelivered(event);
  return { ok: true };
}

/** E14 - invoice issued. Enriches the existing history entry (§9.10). */
export async function applyTrackInvoiceIssued({
  proposalId,
  invoiceNumber,
  invoiceTotal,
  currency,
  invoicedAt,
}) {
  await connectDB();
  const rfq = await TrackRfqRequest.findOne({ "invitations.proposalId": String(proposalId) });
  if (!rfq) return { ok: false };
  const invitation = (rfq.invitations || []).find((i) => String(i.proposalId) === String(proposalId));
  if (!invitation || String(rfq.awardedInvitationId) !== String(invitation._id)) return { ok: false };

  const { event, isNew } = await recordTrackEvent({
    eventType: "invoice_issued",
    direction: "base_to_track",
    idempotencyKey: `invoice_issued:${invitation._id}:${invoiceNumber || "na"}`,
    rfqRequestId: String(rfq._id),
    invitationId: String(invitation._id),
    motorId: String(rfq.motorId || ""),
    proposalId: String(proposalId),
    payload: { invoiceNumber, invoiceTotal },
  });
  if (!isNew) return { ok: true, duplicate: true };

  const when = invoicedAt ? new Date(invoicedAt) : new Date();
  const total = Number(invoiceTotal);
  const update = {
    invoiceNumber: String(invoiceNumber || ""),
    invoicedAt: when,
  };
  if (Number.isFinite(total)) {
    update.finalCost = total;
    update.costSource = "invoice";
    update.currency = String(currency || "USD").toUpperCase();
  }

  const existing = await TrackServiceHistory.findOne({
    rfqRequestId: rfq._id,
    proposalId: String(proposalId),
  });
  if (existing) {
    Object.assign(existing, update);
    await existing.save();
  } else {
    await TrackServiceHistory.create({
      facilityId: rfq.facilityId,
      motorId: rfq.motorId,
      completedAt: rfq.jobCompletedAt || when,
      shopName: invitation.shopName || "",
      shopListingId: invitation.listingId || "",
      jobNumber: invitation.response?.documentNumber || "",
      workType: "other",
      rfqRequestId: rfq._id,
      proposalId: String(proposalId),
      source: "iqmotorbase",
      turnaroundDays: trackTurnaroundDays(rfq.sentAt, rfq.jobCompletedAt || when),
      ...update,
    });
  }
  await recalcTrackMotorRepairTotals(rfq.motorId);

  await notifyFacility(rfq, {
    headline: `${invitation.shopName || "The shop"} issued an invoice`,
    rows: [
      ["Invoice number", invoiceNumber || ""],
      ["Invoice total", Number.isFinite(total) ? trackFormatMoney(total, currency) : ""],
    ],
  });
  await markEventDelivered(event);
  return { ok: true };
}

/**
 * Keep lifetime repair count and cost on the motor in step with its history (§6.4).
 * @param {string|mongoose.Types.ObjectId} motorId
 */
export async function recalcTrackMotorRepairTotals(motorId) {
  await connectDB();
  const rows = await TrackServiceHistory.find({ motorId }).select("finalCost").lean();
  const count = rows.length;
  const cost = rows.reduce((sum, row) => sum + (Number(row.finalCost) || 0), 0);
  await TrackMotor.findByIdAndUpdate(motorId, {
    $set: { lifetimeRepairCount: count, lifetimeRepairCost: Math.round(cost * 100) / 100 },
  });
}

/**
 * The shop deleted the linked proposal - show that shop as Withdrawn (§10).
 * @param {string} proposalId
 */
export async function applyTrackProposalWithdrawn(proposalId) {
  await connectDB();
  const rfq = await TrackRfqRequest.findOne({ "invitations.proposalId": String(proposalId) });
  if (!rfq) return;
  const invitation = (rfq.invitations || []).find((i) => String(i.proposalId) === String(proposalId));
  if (!invitation) return;
  invitation.proposalId = "";
  invitation.status = "withdrawn";
  await rfq.save();
  if (invitation.leadId) {
    await Lead.findByIdAndUpdate(invitation.leadId, {
      $set: { trackProposalId: "", status: "contacted" },
    });
  }
}

export const TRACK_INTEGRATION_MAX_ATTEMPTS = MAX_DELIVERY_ATTEMPTS;
