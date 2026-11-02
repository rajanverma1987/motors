import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { syncNowForShop } from "@/lib/quickbooks/sync";

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await syncNowForShop(user.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("QuickBooks sync-now:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}
