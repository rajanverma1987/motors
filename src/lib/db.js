import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null, customerIndexesSynced: false };

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please set MONGODB_URI in .env.local");
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  if (!cached.customerIndexesSynced) {
    cached.customerIndexesSynced = true;
    try {
      const Customer = (await import("@/models/Customer")).default;
      await Customer.syncIndexes();
    } catch (e) {
      console.warn("Customer.syncIndexes (portalToken index):", e?.message || e);
    }
  }
  return cached.conn;
}
