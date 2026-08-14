import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ account: session });
  } catch (err) {
    console.error("mobile-app me:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
