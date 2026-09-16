import mongoose from "mongoose";

const RFQ_STATUS = ["open", "awarded", "in_repair", "repaired", "closed", "cancelled"];

const INVITATION_STATUS = [
  "invited",
  "viewed",
  "preparing",
  "proposal_received",
  "declined",
  "no_response",
  "awarded",
  "not_selected",
  "withdrawn",
  "cancelled",
];

const DELIVERY_STATUS = ["pending", "sent", "failed"];

const PRICE_BASIS = ["fixed", "estimate", "nte", "teardown_first"];

const URGENCY = ["standard", "emergency"];

const LOGISTICS = ["plant_ships", "shop_pickup", "either"];

const proposalResponseSchema = new mongoose.Schema(
  {
    version: { type: Number, default: 1 },
    totalPrice: { type: Number, default: null },
    currency: { type: String, default: "USD", trim: true, uppercase: true, maxlength: 3 },
    priceBasis: { type: String, enum: PRICE_BASIS, default: "fixed" },
    teardownFee: { type: Number, default: null },
    turnaroundDays: { type: Number, default: null },
    promisedReadyDate: { type: Date, default: null },
    scopeSummary: { type: String, default: "", trim: true, maxlength: 4000 },
    lineItems: { type: mongoose.Schema.Types.Mixed, default: [] },
    logisticsIncluded: { type: Boolean, default: false },
    logisticsCost: { type: Number, default: null },
    warrantyMonths: { type: Number, default: null },
    warrantyCoverage: { type: String, default: "", trim: true, maxlength: 1000 },
    validUntil: { type: Date, default: null },
    notes: { type: String, default: "", trim: true, maxlength: 4000 },
    attachments: { type: [String], default: [] },
    proposalId: { type: String, default: "", trim: true },
    documentNumber: { type: String, default: "", trim: true, maxlength: 80 },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const invitationSchema = new mongoose.Schema(
  {
    listingId: { type: String, default: "", trim: true, index: true },
    shopName: { type: String, default: "", trim: true, maxlength: 200 },
    shopCity: { type: String, default: "", trim: true, maxlength: 120 },
    shopState: { type: String, default: "", trim: true, maxlength: 120 },
    shopRating: { type: Number, default: null },
    distanceLabel: { type: String, default: "", trim: true, maxlength: 80 },
    respondsBy: { type: String, enum: ["in_app", "email"], default: "email" },
    servicedBefore: { type: Boolean, default: false },
    lastServicedAt: { type: Date, default: null },
    status: { type: String, enum: INVITATION_STATUS, default: "invited" },
    deliveryStatus: { type: String, enum: DELIVERY_STATUS, default: "pending" },
    deliveryAttempts: { type: Number, default: 0 },
    deliveryError: { type: String, default: "", trim: true, maxlength: 500 },
    lastAttemptAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    notifiedByEmail: { type: Boolean, default: false },
    leadId: { type: String, default: "", trim: true },
    proposalId: { type: String, default: "", trim: true },
    viewedAt: { type: Date, default: null },
    declineReason: { type: String, default: "", trim: true, maxlength: 500 },
    /** Secure single-use response link for shops without an account (§9.7). */
    emailToken: { type: String, default: "", trim: true, index: true },
    emailTokenExpiresAt: { type: Date, default: null },
    emailTokenUsedAt: { type: Date, default: null },
    response: { type: proposalResponseSchema, default: null },
    responseVersions: { type: [proposalResponseSchema], default: [] },
    invitedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/**
 * One "motor down" event in IQMotorTrack (§7), with one Shop Invitation per selected shop.
 */
const trackRfqRequestSchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackFacility",
      required: true,
      index: true,
    },
    motorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackMotor",
      required: true,
      index: true,
    },
    reference: { type: String, default: "", trim: true, maxlength: 40 },
    status: { type: String, enum: RFQ_STATUS, default: "open" },
    failureDescription: { type: String, required: true, trim: true, maxlength: 4000 },
    urgency: { type: String, enum: URGENCY, default: "standard" },
    logistics: { type: String, enum: LOGISTICS, default: "either" },
    neededBackBy: { type: Date, default: null },
    budgetLimit: { type: Number, default: null },
    failurePhotos: { type: [String], default: [] },
    updateNotes: {
      type: [
        new mongoose.Schema(
          {
            note: { type: String, default: "", trim: true, maxlength: 2000 },
            photos: { type: [String], default: [] },
            at: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    /** Sharing choices made on review screen (§7.4). */
    shareDatasheet: { type: Boolean, default: true },
    shareServiceHistory: { type: Boolean, default: true },
    shareBudget: { type: Boolean, default: false },
    /** Snapshot at send time (§4.5). */
    motorSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    datasheetSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    datasheetSnapshotVersion: { type: Number, default: 0 },
    datasheetSnapshotPowerType: { type: String, default: "", trim: true, uppercase: true, maxlength: 2 },
    datasheetSnapshotProvenance: { type: String, default: "", trim: true, maxlength: 300 },
    serviceHistorySummary: { type: mongoose.Schema.Types.Mixed, default: [] },
    facilitySnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    invitations: { type: [invitationSchema], default: [] },
    awardedInvitationId: { type: String, default: "", trim: true },
    awardedAt: { type: Date, default: null },
    awardedShopName: { type: String, default: "", trim: true, maxlength: 200 },
    jobStartedAt: { type: Date, default: null },
    jobCompletedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: "", trim: true, maxlength: 500 },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

trackRfqRequestSchema.index({ facilityId: 1, status: 1, createdAt: -1 });
trackRfqRequestSchema.index({ motorId: 1, createdAt: -1 });

export const TRACK_RFQ_STATUS = RFQ_STATUS;
export const TRACK_INVITATION_STATUS = INVITATION_STATUS;
export const TRACK_PRICE_BASIS = PRICE_BASIS;
export const TRACK_RFQ_URGENCY = URGENCY;
export const TRACK_RFQ_LOGISTICS = LOGISTICS;

export default mongoose.models.TrackRfqRequest ||
  mongoose.model("TrackRfqRequest", trackRfqRequestSchema);
