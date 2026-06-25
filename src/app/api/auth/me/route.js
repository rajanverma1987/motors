import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getPortalPayloadFromRequest, getPortalTierCookieName } from "@/lib/auth-portal";
import { userIsListingOnlyAccount } from "@/lib/listing-account-restrictions";
import { userIsTrialAccount } from "@/lib/trial-account-restrictions";
import { userIsCalculatorOnlyPortalAccount } from "@/lib/calculator-portal-tier";

export async function GET(request) {
  const payload = await getPortalPayloadFromRequest(request);
  if (!payload?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  await connectDB();
  const email = String(payload.email).trim().toLowerCase();
  const db = await User.findOne({ email }).select("listingOnlyAccount shopName contactName").lean();
  const listingOnly = await userIsListingOnlyAccount(email);
  const trialAccount = !listingOnly && (await userIsTrialAccount(email));
  const calculatorOnlyAccount = await userIsCalculatorOnlyPortalAccount(email);

  const cookieStore = await cookies();
  const tierValue = calculatorOnlyAccount ? "calculator_only" : "full";
  cookieStore.set(getPortalTierCookieName(), tierValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({
    user: {
      email,
      shopName: db?.shopName ?? payload.shopName ?? "",
      contactName: db?.contactName ?? payload.contactName ?? "",
      listingOnlyAccount: listingOnly,
      trialAccount,
      calculatorOnlyAccount,
    },
  });
}
