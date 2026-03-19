import mongoose from "mongoose";

/** Single-doc counter for human-readable support ticket numbers (SUP-####). Document _id: "support". */
const supportTicketCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: "supportticketcounters" }
);

export default mongoose.models.SupportTicketCounter || mongoose.model("SupportTicketCounter", supportTicketCounterSchema);
