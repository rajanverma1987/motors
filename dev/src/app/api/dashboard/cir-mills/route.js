import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { listActivePlatformCirMills } from "@/lib/platform-cir-mills-db";
import { normalizeCirMillsUnit } from "@/lib/platform-cir-mills";

/** Shared Cir Mills catalog for all SaaS calculator users (read-only). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const unit = normalizeCirMillsUnit(searchParams.get("unit"));
    const items = await listActivePlatformCirMills(unit);
    return NextResponse.json({ items, unit });
  } catch (err) {
    console.error("GET cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to load Cir Mills" }, { status: 500 });
  }
}
