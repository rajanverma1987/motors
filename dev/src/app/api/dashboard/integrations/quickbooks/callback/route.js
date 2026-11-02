import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import QuickBooksConnection from "@/models/QuickBooksConnection";
import { exchangeAuthorizationCode, verifyOAuthState } from "@/lib/quickbooks/oauth";
import { fetchCompanyName } from "@/lib/quickbooks/client";
import { simpleSettingsHref } from "@/lib/simple-settings-nav";

function accountsRedirect(request, query = {}) {
  const origin = new URL(request.url).origin;
  const href = simpleSettingsHref("accounts", query);
  return NextResponse.redirect(`${origin}${href}`);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    return accountsRedirect(request, { qbo: "error", qboMsg: error });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId") || searchParams.get("realmID");

  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return accountsRedirect(request, { qbo: "error", qboMsg: "unauthorized" });
    }
    const verified = verifyOAuthState(state);
    if (!verified?.email || verified.email !== user.email.trim().toLowerCase()) {
      return accountsRedirect(request, { qbo: "error", qboMsg: "invalid_state" });
    }
    if (!code || !realmId) {
      return accountsRedirect(request, { qbo: "error", qboMsg: "missing_code" });
    }

    const tokens = await exchangeAuthorizationCode(code);
    const email = user.email.trim().toLowerCase();
    await connectDB();
    await QuickBooksConnection.findOneAndUpdate(
      { ownerEmail: email },
      {
        $set: {
          realmId: String(realmId),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          connectedAt: new Date(),
          disconnectedAt: null,
          active: true,
        },
        $setOnInsert: { ownerEmail: email },
      },
      { upsert: true, new: true }
    );

    try {
      const companyName = await fetchCompanyName(email);
      if (companyName) {
        await QuickBooksConnection.updateOne({ ownerEmail: email }, { $set: { companyName } });
      }
    } catch (nameErr) {
      console.error("QuickBooks company name:", nameErr);
    }

    return accountsRedirect(request, { qbo: "connected" });
  } catch (err) {
    console.error("QuickBooks callback:", err);
    return accountsRedirect(request, {
      qbo: "error",
      qboMsg: encodeURIComponent(err.message || "callback_failed").slice(0, 200),
    });
  }
}
