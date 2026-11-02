import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";

/** Legacy paste-in contacts API. Replaced by listing marketing. */
export async function GET(request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    {
      error:
        "Marketing contacts were replaced by approved listings. Use /api/admin/marketing/listings.",
    },
    { status: 410 }
  );
}

export async function POST(request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Marketing contacts were replaced by approved listings." },
    { status: 410 }
  );
}
