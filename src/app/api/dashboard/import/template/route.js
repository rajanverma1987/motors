import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { listImportCollections, templateCsvForCollection } from "@/lib/import/collections";

export async function GET(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const collection = String(searchParams.get("collection") || "").trim();
  if (!collection) {
    return NextResponse.json({ collections: listImportCollections() });
  }
  const csv = templateCsvForCollection(collection);
  if (!csv) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${collection}-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

