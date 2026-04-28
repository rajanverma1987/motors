import mongoose from "mongoose";

const salesCommissionSchema = new mongoose.Schema(
  {
    /** Legacy: commissions created before job linkage */
    quoteId: { type: String, default: "", trim: true },
    rfqNumber: { type: String, default: "", trim: true },
    /** Repair job write-up this commission belongs to */
    repairFlowJobId: { type: String, default: "", trim: true },
    jobNumber: { type: String, default: "", trim: true },
    salesPersonId: { type: String, required: true, trim: true },
    salesPersonSourceSystem: { type: String, default: "manual_csv", trim: true },
    salesPersonExternalRef: { type: String, default: "", trim: true },
    jobSourceSystem: { type: String, default: "manual_csv", trim: true },
    jobExternalRef: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paidAt: { type: Date, default: null },
    createdByEmail: { type: String, required: true, trim: true },
    sourceSystem: { type: String, default: "manual_csv", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

salesCommissionSchema.index({ createdByEmail: 1, quoteId: 1, createdAt: -1 });
salesCommissionSchema.index({ createdByEmail: 1, rfqNumber: 1 });
salesCommissionSchema.index({ createdByEmail: 1, repairFlowJobId: 1, createdAt: -1 });
salesCommissionSchema.index({ createdByEmail: 1, jobNumber: 1 });
salesCommissionSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  {
    unique: true,
    partialFilterExpression: { externalRef: { $type: "string", $gt: "" } },
  }
);

export default mongoose.models.SalesCommission || mongoose.model("SalesCommission", salesCommissionSchema);
