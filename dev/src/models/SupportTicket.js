import mongoose from "mongoose";

export const SUPPORT_TICKET_CATEGORIES = ["bug", "question", "billing", "feature_request", "other"];
export const SUPPORT_TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"];

const replySchema = new mongoose.Schema(
  {
    from: { type: String, enum: ["shop", "admin"], required: true },
    authorEmail: { type: String, required: true, trim: true, lowercase: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    /** Monotonic display number, e.g. 1042 → "SUP-1042" */
    ticketNumber: { type: Number, required: true, index: true },
    createdByEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    shopName: { type: String, default: "", trim: true },
    contactName: { type: String, default: "", trim: true },
    category: {
      type: String,
      enum: SUPPORT_TICKET_CATEGORIES,
      default: "bug",
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    /** Image URLs from /uploads/support/… (new ticket attachments) */
    attachments: { type: [String], default: [] },
    status: {
      type: String,
      enum: SUPPORT_TICKET_STATUSES,
      default: "open",
      index: true,
    },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true }
);

supportTicketSchema.index({ createdByEmail: 1, updatedAt: -1 });
supportTicketSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);
