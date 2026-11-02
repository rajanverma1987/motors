import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { applyMobileAppIapEntitlement, MOBILE_APP_IAP_PRODUCT_ID } from "@/lib/mobile-app-subscription";
import { verifyAppleSignedTransaction, verifyGooglePlaySubscription } from "@/lib/iap-verify";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const platform = String(body.platform || "").toLowerCase();
    const productId = String(body.productId || MOBILE_APP_IAP_PRODUCT_ID).trim();
    const purchaseToken = String(body.purchaseToken || body.transactionJws || "").trim();

    if (productId !== MOBILE_APP_IAP_PRODUCT_ID) {
      return NextResponse.json({ error: "Unknown subscription product." }, { status: 400 });
    }
    if (!purchaseToken) {
      return NextResponse.json({ error: "Missing purchase token." }, { status: 400 });
    }

    let verified;
    if (platform === "ios") {
      verified = await verifyAppleSignedTransaction(purchaseToken);
    } else if (platform === "android") {
      verified = await verifyGooglePlaySubscription(purchaseToken);
    } else {
      return NextResponse.json({ error: "Unsupported store platform." }, { status: 400 });
    }

    await applyMobileAppIapEntitlement(account, verified);
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ account: session, activated: true });
  } catch (err) {
    const code = String(err?.code || "");
    if (code === "GOOGLE_CREDENTIALS_MISSING") {
      return NextResponse.json(
        { error: "We couldn't verify your subscription. Please try again.", code },
        { status: 503 }
      );
    }
    console.error("mobile-app iap verify:", err);
    return NextResponse.json(
      { error: err.message || "We couldn't verify your subscription. Please try again." },
      { status: 400 }
    );
  }
}
