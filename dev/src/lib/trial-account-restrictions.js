import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import ShopSubscription from "@/models/ShopSubscription";
import { planIsTrialTier } from "@/lib/trial-tier-plan";

/**
 * True when the shop is on the self-signup Trial subscription plan.
 */
export async function userIsTrialAccount(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return false;
  await connectDB();
  const sub = await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean();
  if (!sub?.planId) return false;
  return planIsTrialTier(sub.planId);
}

export async function shopCustomerCount(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return 0;
  await connectDB();
  return Customer.countDocuments({ createdByEmail: email });
}
