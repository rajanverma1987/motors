import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { buildSimpleHubOverview } from "@/lib/simple-hub-overview";

/**
 * GET /api/dashboard/simple-hub-overview?from=&to=
 * Hub Dashboard aggregates (KPIs + chart series).
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.calculatorOnlyAccount) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const data = await buildSimpleHubOverview(user.email, { from, to });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("GET /api/dashboard/simple-hub-overview:", err);
    return NextResponse.json({ error: "Failed to load dashboard overview" }, { status: 500 });
  }
}
