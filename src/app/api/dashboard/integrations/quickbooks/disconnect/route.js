import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import QuickBooksConnection from "@/models/QuickBooksConnection";
import UserSettings from "@/models/UserSettings";
import { revokeToken } from "@/lib/quickbooks/oauth";

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const conn = await QuickBooksConnection.findOne({ ownerEmail: email, active: true });
    if (conn) {
      await revokeToken(conn.refreshToken || conn.accessToken);
      conn.active = false;
      conn.disconnectedAt = new Date();
      conn.accessToken = "";
      conn.refreshToken = "";
      await conn.save();
    }
    await UserSettings.findOneAndUpdate(
      { ownerEmail: email },
      { $set: { "settings.quickBooksEnabled": false } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("QuickBooks disconnect:", err);
    return NextResponse.json({ error: err.message || "Failed to disconnect" }, { status: 500 });
  }
}
