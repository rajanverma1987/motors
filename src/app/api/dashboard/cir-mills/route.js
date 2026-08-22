import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { listActivePlatformCirMills } from "@/lib/platform-cir-mills-db";

/** Shared Cir Mills catalog for all SaaS calculator users (read-only). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await listActivePlatformCirMills();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to load Cir Mills" }, { status: 500 });
  }
}
