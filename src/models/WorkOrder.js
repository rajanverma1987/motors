import mongoose from "mongoose";

const workOrderSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true, lowercase: true },
    quoteId: { type: String, required: true, trim: true },
    motorId: { type: String, required: true, trim: true },
    customerId: { type: String, required: true, trim: true },
    /** e.g. W-A00001-1 */
    workOrderNumber: { type: String, required: true, trim: true },
    date: { type: String, default: "", trim: true },
    technicianEmployeeId: { type: String, default: "", trim: true },
    jobType: { type: String, default: "complete_motor", trim: true },
    /** AC | DC */
    motorClass: { type: String, default: "AC", trim: true },
    status: { type: String, default: "Assigned", trim: true },
    companyName: { type: String, default: "", trim: true },
    quoteRfqNumber: { type: String, default: "", trim: true },
    acSpecs: { type: mongoose.Schema.Types.Mixed, default: {} },
    dcSpecs: { type: mongoose.Schema.Types.Mixed, default: {} },
    armatureSpecs: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

workOrderSchema.index({ createdByEmail: 1, createdAt: -1 });
workOrderSchema.index({ createdByEmail: 1, quoteId: 1 });
workOrderSchema.index({ createdByEmail: 1, workOrderNumber: 1 }, { unique: true });

export default mongoose.models.WorkOrder || mongoose.model("WorkOrder", workOrderSchema);
