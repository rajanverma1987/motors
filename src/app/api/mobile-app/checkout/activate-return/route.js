import { NextResponse } from "next/server";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { syncMobileAppPaypalSubscription } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

/** After PayPal return — only grant access if PayPal says the subscription is ACTIVE. */
export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const { account: synced, activated, paypalStatus } = await syncMobileAppPaypalSubscription(account);
    const session = await mobileAppSessionPayload(synced || account);
    return NextResponse.json({ account: session, activated, paypalStatus });
  } catch (err) {
    console.error("mobile-app activate-return:", err);
    return NextResponse.json({ error: err.message || "Activation failed" }, { status: 500 });
  }
}
