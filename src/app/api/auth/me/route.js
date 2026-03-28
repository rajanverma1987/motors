import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { userIsListingOnlyAccount } from "@/lib/listing-account-restrictions";

export async function GET(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  await connectDB();
  const email = user.email.trim().toLowerCase();
  const db = await User.findOne({ email }).select("listingOnlyAccount shopName contactName").lean();
  const listingOnly = await userIsListingOnlyAccount(email);
  return NextResponse.json({
    user: {
      email: user.email,
      shopName: db?.shopName ?? user.shopName ?? "",
      contactName: db?.contactName ?? user.contactName ?? "",
      listingOnlyAccount: listingOnly,
    },
  });
}
