import { NextResponse } from "next/server";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { applyMobileAppSubscriptionActivated } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

/** After PayPal approval — grant a billing period immediately (webhook still reconciles). */
export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const subId = String(account.paypalSubscriptionId || "").trim();
    if (subId) {
      await applyMobileAppSubscriptionActivated({ paypalSubscriptionId: subId, eventId: "activate-return" });
    }
    const fresh = await MobileAppAccount.findById(account._id);
    const session = await mobileAppSessionPayload(fresh || account);
    return NextResponse.json({ account: session });
  } catch (err) {
    console.error("mobile-app activate-return:", err);
    return NextResponse.json({ error: err.message || "Activation failed" }, { status: 500 });
  }
}
