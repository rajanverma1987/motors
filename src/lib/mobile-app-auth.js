import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getBearerTokenFromRequest, verifyMobileAppToken } from "@/lib/auth-portal";
import {
  describeMobileAppAccess,
  getMobileAppSubscriptionPlan,
  mobileAppAccountToJson,
} from "@/lib/mobile-app-subscription";

export async function getMobileAppAccountFromRequest(request) {
  const token = getBearerTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyMobileAppToken(token);
  if (!payload?.accountId) return null;
  await connectDB();
  const account = await MobileAppAccount.findById(payload.accountId);
  if (!account || account.canLogin === false) return null;
  if (String(account.email).toLowerCase() !== payload.email) return null;
  return account;
}

export function mobileAppUnauthorized() {
  return { error: "Sign in required.", code: "AUTH_REQUIRED" };
}

export async function mobileAppSessionPayload(account) {
  const plan = await getMobileAppSubscriptionPlan();
  const access = describeMobileAppAccess(account);
  return mobileAppAccountToJson(account, access, plan);
}
