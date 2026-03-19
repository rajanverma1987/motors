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
    /** Notes from Motop Technician app (append-only log) */
    technicianAppNotes: {
      type: [
        {
          at: { type: Date, default: Date.now },
          text: { type: String, default: "", trim: true, maxlength: 4000 },
          authorId: { type: String, default: "", trim: true },
          authorName: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    /** Before photos from technician app (shop-floor condition). */
    technicianBeforePhotos: {
      type: [
        {
          url: { type: String, required: true, trim: true },
          uploadedAt: { type: Date, default: Date.now },
          authorId: { type: String, default: "", trim: true },
          authorName: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    /** After photos from technician app (post-repair). */
    technicianAfterPhotos: {
      type: [
        {
          url: { type: String, required: true, trim: true },
          uploadedAt: { type: Date, default: Date.now },
          authorId: { type: String, default: "", trim: true },
          authorName: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

workOrderSchema.index({ createdByEmail: 1, createdAt: -1 });
workOrderSchema.index({ createdByEmail: 1, quoteId: 1 });
workOrderSchema.index({ createdByEmail: 1, workOrderNumber: 1 }, { unique: true });
workOrderSchema.index({ createdByEmail: 1, technicianEmployeeId: 1, updatedAt: -1 });

export default mongoose.models.WorkOrder || mongoose.model("WorkOrder", workOrderSchema);
