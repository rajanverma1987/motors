import mongoose from "mongoose";

/**
 * Inbound demo / pricing requests from the marketing site.
 *
 * These used to be email-only: /api/contact-demo and /api/pricing-contact sent a
 * notification to contact@IQMotorBase.com and stored nothing. When SMTP failed the
 * visitor got an error and the lead was gone with no trace, and there was no way to
 * tell "nobody submitted" apart from "delivery broke". Every submission is now
 * persisted first and the email outcome recorded against it, so the mailbox is a
 * convenience rather than the only copy.
 */
const demoRequestSchema = new mongoose.Schema(
  {
    /** Which form produced this. Both forms notify through the same email path. */
    formType: {
      type: String,
      enum: ["demo", "pricing_general", "pricing_founder"],
      default: "demo",
      index: true,
    },

    // Contact
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: "", trim: true },

    // Business
    businessName: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    businessType: { type: String, default: "", trim: true },
    teamSize: { type: String, default: "", trim: true },

    // Demo scheduling preference (demo form only)
    preferDate: { type: String, default: "", trim: true },
    preferTime: { type: String, default: "", trim: true },
    timezone: { type: String, default: "", trim: true },

    // Qualification
    currentTools: { type: String, default: "", trim: true },
    mainProblem: { type: String, default: "", trim: true },

    /** Marketing page the form was submitted from — the only attribution signal available. */
    sourcePage: { type: String, default: "", trim: true },

    /** Follow-up pipeline, mirroring the Lead model's vocabulary. */
    status: {
      type: String,
      enum: ["new", "contacted", "demo_booked", "won", "lost"],
      default: "new",
      index: true,
    },
    /** Internal follow-up notes. Never shown to the requester. */
    adminNotes: { type: String, default: "", trim: true },

    /**
     * Outcome of the notification email. "failed" means this record is the ONLY
     * copy of the lead — surfaced in admin so it can still be worked.
     */
    notifyEmailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    notifyEmailError: { type: String, default: "", trim: true },
    thankYouEmailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

demoRequestSchema.index({ createdAt: -1 });
demoRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.DemoRequest || mongoose.model("DemoRequest", demoRequestSchema);
