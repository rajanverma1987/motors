import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
    customerIndexesSynced: false,
    salesCommissionIndexesSynced: false,
  };
}

async function ensureIndexes() {
  if (!cached.customerIndexesSynced) {
    cached.customerIndexesSynced = true;
    try {
      const Customer = (await import("@/models/Customer")).default;
      await Customer.syncIndexes();
    } catch (e) {
      console.warn("Customer.syncIndexes (portalToken index):", e?.message || e);
    }
  }
  if (!cached.salesCommissionIndexesSynced) {
    cached.salesCommissionIndexesSynced = true;
    try {
      const SalesCommission = (await import("@/models/SalesCommission")).default;
      // Legacy unique { createdByEmail, quoteId } blocked multiple commissions per job.
      try {
        await SalesCommission.collection.dropIndex("createdByEmail_1_quoteId_1");
      } catch (e) {
        const missing = e?.code === 27 || e?.codeName === "IndexNotFound";
        if (!missing) {
          console.warn("SalesCommission dropIndex createdByEmail_1_quoteId_1:", e?.message || e);
        }
      }
      await SalesCommission.syncIndexes();
    } catch (e) {
      console.warn("SalesCommission.syncIndexes:", e?.message || e);
    }
  }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please set MONGODB_URI in .env.local");
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  await ensureIndexes();
  return cached.conn;
}
