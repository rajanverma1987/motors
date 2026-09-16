import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    message: { type: String, default: "" },
    company: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    motorType: { type: String, default: "" },
    motorHp: { type: String, default: "" },
    voltage: { type: String, default: "" },
    problemDescription: { type: String, default: "" },
    urgencyLevel: { type: String, default: "" },
    /** Industry vertical tag from marketing pages (e.g. manufacturing, water-treatment). */
    industry: { type: String, default: "" },
    motorPhotos: [{ type: String }],
    sourceListingId: { type: String, default: "" },
    assignedListingIds: [{ type: String }],
    /** CRM: new → contacted → quoted → won | lost */
    status: { type: String, enum: ["new", "contacted", "quoted", "won", "lost"], default: "new" },
    /** How lead arrived: website submission, admin assignment, manual entry, contact unlock, or IQMotorTrack RFQ */
    leadSource: {
      type: String,
      enum: ["website", "admin_assigned", "manual", "contact_unlock", "iqmotortrack"],
      default: "website",
    },
    /** Reason captured when a shop declines to quote an IQMotorTrack RFQ (§9.4). */
    declineReason: { type: String, default: "" },
    /** Reason a lead moved to lost (e.g. "Awarded to another shop"). */
    lostReason: { type: String, default: "" },
    /** IQMotorTrack integration: stable external identifiers (§9.3). */
    trackFacilityId: { type: String, default: "" },
    trackRfqRequestId: { type: String, default: "" },
    trackInvitationId: { type: String, default: "" },
    trackMotorId: { type: String, default: "" },
    /** Structured motor snapshot from IQMotorTrack, never flattened into `message`. */
    trackMotorSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Latest datasheet version shared with this RFQ, or null when not shared. */
    trackDatasheetSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    trackDatasheetProvenance: { type: String, default: "" },
    /** Power type the shared datasheet was recorded under, for the §9.5 D conflict check. */
    trackDatasheetPowerType: { type: String, default: "" },
    /** Past repair dates / work types / failure causes, never other shops' prices. */
    trackServiceHistorySummary: { type: mongoose.Schema.Types.Mixed, default: [] },
    /** Count only, never shop names (§12). */
    trackInvitedShopCount: { type: Number, default: 0 },
    trackLogistics: { type: String, default: "" },
    trackNeededBackBy: { type: Date, default: null },
    trackBudgetLimit: { type: Number, default: null },
    trackFacilityName: { type: String, default: "" },
    trackFacilityAddress: { type: String, default: "" },
    trackFacilityState: { type: String, default: "" },
    trackFacilityCountry: { type: String, default: "" },
    trackViewedAt: { type: Date, default: null },
    /** SimpleServiceProposal _id once the shop converts this lead. */
    trackProposalId: { type: String, default: "" },
    trackConvertedAt: { type: Date, default: null },
    trackProposalSentAt: { type: Date, default: null },
    trackAwardedAt: { type: Date, default: null },
    /** Softer intent than repair_request — set when visitor unlocks shop contact info */
    leadType: {
      type: String,
      enum: ["repair_request", "contact_view", ""],
      default: "",
    },
    /** Set when lead is created manually from dashboard (shop user email) */
    createdByEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index(
  { trackInvitationId: 1 },
  { unique: true, partialFilterExpression: { trackInvitationId: { $type: "string", $gt: "" } } }
);
leadSchema.index({ leadSource: 1, createdAt: -1 });
leadSchema.index({ trackRfqRequestId: 1 });

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
