import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { getAdminListingStats } from "@/lib/listing-page-views";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const sortBy = searchParams.get("sortBy");
    const sortDir = searchParams.get("sortDir");

    const data = await getAdminListingStats({ page, pageSize, search, sort, sortBy, sortDir });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/admin/listing-stats:", err);
    return NextResponse.json({ error: "Failed to load listing stats" }, { status: 500 });
  }
}
