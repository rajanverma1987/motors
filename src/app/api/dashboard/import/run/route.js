import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { importCollectionCsv } from "@/lib/import/collections";

export async function POST(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const collection = String(body.collection || "").trim();
    const csvText = String(body.csvText || "");
    if (!collection) {
      return NextResponse.json({ error: "collection is required" }, { status: 400 });
    }
    if (!csvText.trim()) {
      return NextResponse.json({ error: "csvText is required" }, { status: 400 });
    }
    const result = await importCollectionCsv({
      collection,
      csvText,
      ownerEmail: user.email.trim().toLowerCase(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Import run error:", err);
    return NextResponse.json({ error: err?.message || "Import failed" }, { status: 400 });
  }
}

