/**
 * IQMotorTrack RFQ vocabulary, serializers and comparison rules (§7, §8, §9.11).
 */

export const TRACK_RFQ_STATUS_LABEL = {
  open: "Open",
  awarded: "Awarded",
  in_repair: "In repair",
  repaired: "Repaired",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const TRACK_RFQ_STATUS_VARIANT = {
  open: "primary",
  awarded: "success",
  in_repair: "warning",
  repaired: "primary",
  closed: "default",
  cancelled: "default",
};

export const TRACK_INVITATION_STATUS_LABEL = {
  invited: "Invited",
  viewed: "Viewed",
  preparing: "Preparing",
  proposal_received: "Proposal received",
  declined: "Declined to quote",
  no_response: "No response",
  awarded: "Awarded",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export const TRACK_INVITATION_STATUS_VARIANT = {
  invited: "default",
  viewed: "primary",
  preparing: "primary",
  proposal_received: "success",
  declined: "danger",
  no_response: "default",
  awarded: "success",
  not_selected: "default",
  withdrawn: "danger",
  cancelled: "default",
};

export const TRACK_PRICE_BASIS_LABEL = {
  fixed: "Fixed price",
  estimate: "Estimate",
  nte: "Not to exceed",
  teardown_first: "Teardown and inspect first",
};

export const TRACK_URGENCY_LABEL = {
  standard: "Standard",
  emergency: "Emergency",
};

export const TRACK_LOGISTICS_LABEL = {
  plant_ships: "Plant will ship",
  shop_pickup: "Shop must pick up",
  either: "Either",
};

export const TRACK_URGENCY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "emergency", label: "Emergency" },
];

export const TRACK_LOGISTICS_OPTIONS = [
  { value: "plant_ships", label: "Plant will ship" },
  { value: "shop_pickup", label: "Shop must pick up" },
  { value: "either", label: "Either" },
];

export const TRACK_PRICE_BASIS_OPTIONS = [
  { value: "fixed", label: "Fixed price" },
  { value: "estimate", label: "Estimate" },
  { value: "nte", label: "Not to exceed" },
  { value: "teardown_first", label: "Teardown and inspect first" },
];

export const TRACK_DECLINE_REASONS = [
  { value: "capacity", label: "No capacity right now" },
  { value: "outside_capability", label: "Outside our capability" },
  { value: "too_far", label: "Too far from us" },
  { value: "other", label: "Other" },
];

/** §16 D2: 5 shops per RFQ on Free, unlimited on Pro. */
export const TRACK_FREE_MAX_SHOPS_PER_RFQ = 5;

/**
 * @param {boolean} isPro
 */
export function trackMaxShopsPerRfq(isPro) {
  return isPro ? Number.POSITIVE_INFINITY : TRACK_FREE_MAX_SHOPS_PER_RFQ;
}

/** Statuses that mean the RFQ is still collecting or holding proposals. */
export const TRACK_RFQ_ACTIVE_STATUSES = ["open", "awarded", "in_repair", "repaired"];

/**
 * "Not provided" is required by §8.2 - a missing value must never render as zero.
 * @param {unknown} value
 */
export function trackOrNotProvided(value) {
  if (value === null || value === undefined) return "Not provided";
  const str = String(value).trim();
  return str ? str : "Not provided";
}

/**
 * @param {number|null|undefined} amount
 * @param {string} [currency]
 */
export function trackFormatMoney(amount, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") return "Not provided";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "Not provided";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${num.toFixed(2)}`;
  }
}

/**
 * @param {Date|string|null|undefined} value
 */
export function trackIsExpired(value) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  return time < Date.now();
}

/**
 * Cheapest / fastest highlights, compared only inside the same price basis (§8.2)
 * and never across expired proposals.
 *
 * @param {{ id: string, status: string, response: Record<string, unknown>|null }[]} invitations
 * @returns {{ cheapestIds: string[], fastestIds: string[] }}
 */
export function trackComparisonHighlights(invitations) {
  const byBasis = new Map();
  for (const inv of Array.isArray(invitations) ? invitations : []) {
    const res = inv?.response;
    if (!res) continue;
    if (trackIsExpired(res.validUntil)) continue;
    const basis = String(res.priceBasis || "fixed");
    if (!byBasis.has(basis)) byBasis.set(basis, []);
    byBasis.get(basis).push({ id: String(inv.id), res });
  }

  const cheapestIds = [];
  const fastestIds = [];
  for (const group of byBasis.values()) {
    if (group.length < 2) continue;

    const priced = group.filter((g) => Number.isFinite(Number(g.res.totalPrice)));
    if (priced.length > 1) {
      const min = Math.min(...priced.map((g) => Number(g.res.totalPrice)));
      for (const g of priced) {
        if (Number(g.res.totalPrice) === min) cheapestIds.push(g.id);
      }
    }

    const timed = group.filter((g) => Number.isFinite(Number(g.res.turnaroundDays)));
    if (timed.length > 1) {
      const min = Math.min(...timed.map((g) => Number(g.res.turnaroundDays)));
      for (const g of timed) {
        if (Number(g.res.turnaroundDays) === min) fastestIds.push(g.id);
      }
    }
  }
  return { cheapestIds, fastestIds };
}

function isoOrNull(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function serializeResponse(res) {
  if (!res) return null;
  const plain = res.toObject ? res.toObject() : res;
  return {
    version: Number(plain.version) || 1,
    totalPrice: plain.totalPrice === null || plain.totalPrice === undefined ? null : Number(plain.totalPrice),
    currency: String(plain.currency || "USD").toUpperCase(),
    priceBasis: String(plain.priceBasis || "fixed"),
    teardownFee:
      plain.teardownFee === null || plain.teardownFee === undefined ? null : Number(plain.teardownFee),
    turnaroundDays:
      plain.turnaroundDays === null || plain.turnaroundDays === undefined
        ? null
        : Number(plain.turnaroundDays),
    promisedReadyDate: isoOrNull(plain.promisedReadyDate),
    scopeSummary: String(plain.scopeSummary || ""),
    lineItems: Array.isArray(plain.lineItems) ? plain.lineItems : [],
    logisticsIncluded: Boolean(plain.logisticsIncluded),
    logisticsCost:
      plain.logisticsCost === null || plain.logisticsCost === undefined ? null : Number(plain.logisticsCost),
    warrantyMonths:
      plain.warrantyMonths === null || plain.warrantyMonths === undefined
        ? null
        : Number(plain.warrantyMonths),
    warrantyCoverage: String(plain.warrantyCoverage || ""),
    validUntil: isoOrNull(plain.validUntil),
    notes: String(plain.notes || ""),
    attachments: Array.isArray(plain.attachments) ? plain.attachments : [],
    documentNumber: String(plain.documentNumber || ""),
    receivedAt: isoOrNull(plain.receivedAt),
    expired: trackIsExpired(plain.validUntil),
  };
}

/**
 * Facility-facing invitation JSON. Never leaks anything about other shops.
 * @param {Record<string, unknown>} inv
 */
export function serializeTrackInvitation(inv) {
  const plain = inv?.toObject ? inv.toObject() : inv || {};
  return {
    id: String(plain._id || plain.id || ""),
    listingId: String(plain.listingId || ""),
    shopName: String(plain.shopName || ""),
    shopCity: String(plain.shopCity || ""),
    shopState: String(plain.shopState || ""),
    shopRating: plain.shopRating === null || plain.shopRating === undefined ? null : Number(plain.shopRating),
    distanceLabel: String(plain.distanceLabel || ""),
    respondsBy: String(plain.respondsBy || "email"),
    servicedBefore: Boolean(plain.servicedBefore),
    lastServicedAt: isoOrNull(plain.lastServicedAt),
    status: String(plain.status || "invited"),
    statusLabel: TRACK_INVITATION_STATUS_LABEL[String(plain.status || "invited")] || "Invited",
    deliveryStatus: String(plain.deliveryStatus || "pending"),
    deliveryError: String(plain.deliveryError || ""),
    deliveryAttempts: Number(plain.deliveryAttempts) || 0,
    deliveredAt: isoOrNull(plain.deliveredAt),
    notifiedByEmail: Boolean(plain.notifiedByEmail),
    viewedAt: isoOrNull(plain.viewedAt),
    declineReason: String(plain.declineReason || ""),
    invitedAt: isoOrNull(plain.invitedAt),
    response: serializeResponse(plain.response),
    responseHistory: (Array.isArray(plain.responseVersions) ? plain.responseVersions : [])
      .map(serializeResponse)
      .filter(Boolean),
  };
}

/**
 * @param {Record<string, unknown>} doc
 */
export function serializeTrackRfq(doc) {
  const plain = doc?.toObject ? doc.toObject() : doc || {};
  const invitations = (Array.isArray(plain.invitations) ? plain.invitations : []).map(
    serializeTrackInvitation
  );
  const proposalsReceived = invitations.filter((i) => i.response).length;
  return {
    id: String(plain._id || plain.id || ""),
    motorId: String(plain.motorId || ""),
    reference: String(plain.reference || ""),
    status: String(plain.status || "open"),
    statusLabel: TRACK_RFQ_STATUS_LABEL[String(plain.status || "open")] || "Open",
    failureDescription: String(plain.failureDescription || ""),
    urgency: String(plain.urgency || "standard"),
    logistics: String(plain.logistics || "either"),
    neededBackBy: isoOrNull(plain.neededBackBy),
    budgetLimit:
      plain.budgetLimit === null || plain.budgetLimit === undefined ? null : Number(plain.budgetLimit),
    failurePhotos: Array.isArray(plain.failurePhotos) ? plain.failurePhotos : [],
    updateNotes: (Array.isArray(plain.updateNotes) ? plain.updateNotes : []).map((u) => ({
      note: String(u?.note || ""),
      photos: Array.isArray(u?.photos) ? u.photos : [],
      at: isoOrNull(u?.at),
    })),
    shareDatasheet: Boolean(plain.shareDatasheet),
    shareServiceHistory: Boolean(plain.shareServiceHistory),
    shareBudget: Boolean(plain.shareBudget),
    motorSnapshot: plain.motorSnapshot || {},
    datasheetShared: Boolean(plain.datasheetSnapshot),
    datasheetSnapshotVersion: Number(plain.datasheetSnapshotVersion) || 0,
    datasheetSnapshotPowerType: String(plain.datasheetSnapshotPowerType || ""),
    datasheetSnapshotProvenance: String(plain.datasheetSnapshotProvenance || ""),
    serviceHistorySummary: Array.isArray(plain.serviceHistorySummary) ? plain.serviceHistorySummary : [],
    invitations,
    invitedCount: invitations.length,
    proposalsReceived,
    awardedInvitationId: String(plain.awardedInvitationId || ""),
    awardedShopName: String(plain.awardedShopName || ""),
    awardedAt: isoOrNull(plain.awardedAt),
    jobStartedAt: isoOrNull(plain.jobStartedAt),
    jobCompletedAt: isoOrNull(plain.jobCompletedAt),
    closedAt: isoOrNull(plain.closedAt),
    cancelledAt: isoOrNull(plain.cancelledAt),
    cancelReason: String(plain.cancelReason || ""),
    sentAt: isoOrNull(plain.sentAt),
    createdAt: isoOrNull(plain.createdAt),
    updatedAt: isoOrNull(plain.updatedAt),
    ...trackComparisonHighlights(invitations),
  };
}

/**
 * Turnaround days from RFQ sent to job completed (§6.7).
 * @param {Date|string|null|undefined} sentAt
 * @param {Date|string|null|undefined} completedAt
 */
export function trackTurnaroundDays(sentAt, completedAt) {
  if (!sentAt || !completedAt) return null;
  const from = new Date(sentAt).getTime();
  const to = new Date(completedAt).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.max(0, Math.round((to - from) / 86400000));
}

/** Short human reference like RFQ-8F3C2A. */
export function buildTrackRfqReference(id) {
  const raw = String(id || "").replace(/[^a-f0-9]/gi, "");
  return `RFQ-${raw.slice(-6).toUpperCase()}`;
}
