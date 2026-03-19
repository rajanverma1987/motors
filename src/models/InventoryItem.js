import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true },
    /** Unit of measure (ea, lb, ft, etc.) */
    uom: { type: String, default: "ea", trim: true },
    /** Physical quantity in stock */
    onHand: { type: Number, default: 0 },
    /** Quantity reserved for active work tied to quotes (not yet shipped) */
    reserved: { type: Number, default: 0 },
    /** Alert when available (onHand − reserved) is at or below this */
    threshold: { type: Number, default: 0 },
    location: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ createdByEmail: 1, createdAt: -1 });
inventoryItemSchema.index({ createdByEmail: 1, sku: 1 });

// Next.js dev HMR can keep a stale compiled model without newer paths (e.g. `uom`), which makes Mongoose
// strip those keys on save. Drop the cached model in development so the current schema always applies.
if (process.env.NODE_ENV !== "production" && mongoose.models.InventoryItem) {
  delete mongoose.models.InventoryItem;
}

export default mongoose.models.InventoryItem ?? mongoose.model("InventoryItem", inventoryItemSchema);
