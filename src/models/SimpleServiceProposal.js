import mongoose from "mongoose";

/**
 * Simple portal (/dashboards) service proposals — RFQ / JOB / INVOICE.
 * Uses strict:false so the full form/list payload (scope, datasheets, etc.) is stored.
 */
const simpleServiceProposalSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true },
    customerId: { type: String, default: "", trim: true },
    documentNumber: { type: String, default: "", trim: true },
    recordType: { type: String, default: "RFQ", trim: true },
    status: { type: String, default: "", trim: true },
    jobStatus: { type: String, default: "", trim: true },
    dateCreated: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
  },
  { timestamps: true, strict: false }
);

simpleServiceProposalSchema.index({ createdByEmail: 1, updatedAt: -1 });
simpleServiceProposalSchema.index({ createdByEmail: 1, documentNumber: 1 });
simpleServiceProposalSchema.index({ createdByEmail: 1, recordType: 1 });
simpleServiceProposalSchema.index({ createdByEmail: 1, customerId: 1 });
simpleServiceProposalSchema.index({ createdByEmail: 1, dateCreated: -1 });

export default mongoose.models.SimpleServiceProposal ||
  mongoose.model("SimpleServiceProposal", simpleServiceProposalSchema);
