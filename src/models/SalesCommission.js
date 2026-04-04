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
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paidAt: { type: Date, default: null },
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

salesCommissionSchema.index({ createdByEmail: 1, quoteId: 1, createdAt: -1 });
salesCommissionSchema.index({ createdByEmail: 1, rfqNumber: 1 });
salesCommissionSchema.index({ createdByEmail: 1, repairFlowJobId: 1, createdAt: -1 });
salesCommissionSchema.index({ createdByEmail: 1, jobNumber: 1 });

export default mongoose.models.SalesCommission || mongoose.model("SalesCommission", salesCommissionSchema);
