import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { buildShopDataWorkbook } from "@/lib/simple-import/export-shop-data";

export async function GET(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { buffer, filename } = await buildShopDataWorkbook(user.email);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Shop data export error:", err);
    return NextResponse.json({ error: err?.message || "Failed to download your data" }, { status: 500 });
  }
}
