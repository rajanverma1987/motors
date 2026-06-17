import { connectDB } from "@/lib/db";
import User from "@/models/User";

/** Record a successful portal sign-in for the shop owner account. */
export async function recordPortalLogin(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  await User.updateOne({ email }, { $set: { lastLoginAt: new Date() } });
}
