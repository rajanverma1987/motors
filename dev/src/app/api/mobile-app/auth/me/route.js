import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { syncMobileAppPaypalSubscription } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const { account: synced } = await syncMobileAppPaypalSubscription(account);
    const session = await mobileAppSessionPayload(synced || account);
    return NextResponse.json({ account: session });
  } catch (err) {
    console.error("mobile-app me:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
