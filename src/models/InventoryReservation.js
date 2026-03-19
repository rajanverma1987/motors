import mongoose from "mongoose";

const inventoryReservationSchema = new mongoose.Schema(
  {
    createdByEmail: { type: String, required: true, trim: true },
    quoteId: { type: String, required: true, trim: true },
    workOrderId: { type: String, default: "", trim: true },
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

inventoryReservationSchema.index({ createdByEmail: 1, quoteId: 1, status: 1 });
inventoryReservationSchema.index({ createdByEmail: 1, inventoryItemId: 1, status: 1 });

export default mongoose.models.InventoryReservation ||
  mongoose.model("InventoryReservation", inventoryReservationSchema);
