import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { intuitConfigured } from "@/lib/quickbooks/constants";
import { buildAuthorizeUrl } from "@/lib/quickbooks/oauth";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!intuitConfigured()) {
      return NextResponse.json(
        { error: "QuickBooks is not configured on this server. Set INTUIT_CLIENT_ID, INTUIT_CLIENT_SECRET, and INTUIT_REDIRECT_URI." },
        { status: 503 }
      );
    }
    const url = buildAuthorizeUrl(user.email);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("QuickBooks connect:", err);
    return NextResponse.json({ error: err.message || "Failed to start QuickBooks connect" }, { status: 500 });
  }
}
