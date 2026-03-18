import mongoose from "mongoose";

const logisticsEntrySchema = new mongoose.Schema(
  {
    createdByEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    kind: {
      type: String,
      required: true,
      enum: ["motor_receiving", "motor_shipping", "vendor_po_receiving"],
    },
    date: { type: String, default: "", trim: true },
    invoiceNumber: { type: String, default: "", trim: true },
    jobNumber: { type: String, default: "", trim: true },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    /** Denormalized PO# for list display */
    poNumberSnapshot: { type: String, default: "", trim: true },
    mannerOfTransport: { type: String, default: "", trim: true },
    freight: { type: String, default: "", trim: true },
    droppedBy: { type: String, default: "", trim: true },
    pickedBy: { type: String, default: "", trim: true },
    charges: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

logisticsEntrySchema.index({ createdByEmail: 1, kind: 1, createdAt: -1 });

export default mongoose.models.LogisticsEntry ||
  mongoose.model("LogisticsEntry", logisticsEntrySchema);
