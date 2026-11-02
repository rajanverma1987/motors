import mongoose from "mongoose";

const inventoryReservationSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true },
    /** Classic Quote id (empty when reservation is for Simple portal). */
    quoteId: { type: String, required: false, default: "", trim: true },
    /** Simple Service Proposal id (empty when reservation is for classic Quote). */
    simpleServiceProposalId: { type: String, required: false, default: "", trim: true },
    workOrderId: { type: String, default: "", trim: true },
    /** Work order that triggered consumption (when status → consumed); may differ from workOrderId (first WO on quote). */
    consumedByWorkOrderId: { type: String, default: "", trim: true },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    qty: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "consumed", "released"],
      default: "active",
      trim: true,
    },
  },
  { timestamps: true }
);

inventoryReservationSchema.pre("validate", function () {
  const quoteId = String(this.quoteId || "").trim();
  const simpleId = String(this.simpleServiceProposalId || "").trim();
  if (!quoteId && !simpleId) {
    this.invalidate("simpleServiceProposalId", "quoteId or simpleServiceProposalId is required");
  }
});

inventoryReservationSchema.index({ createdByEmail: 1, quoteId: 1, status: 1 });
inventoryReservationSchema.index({ createdByEmail: 1, simpleServiceProposalId: 1, status: 1 });
inventoryReservationSchema.index({ createdByEmail: 1, inventoryItemId: 1, status: 1 });
inventoryReservationSchema.index({ createdByEmail: 1, inventoryItemId: 1, updatedAt: -1 });

// Hot-reload: drop cached model so schema changes (optional quoteId) take effect.
if (mongoose.models.InventoryReservation) {
  delete mongoose.models.InventoryReservation;
}
if (mongoose.modelSchemas?.InventoryReservation) {
  delete mongoose.modelSchemas.InventoryReservation;
}

export default mongoose.model("InventoryReservation", inventoryReservationSchema);
