import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { buildSimpleReportExport } from "@/lib/simple-reports/builders";
import { isValidSimpleReportId, parseReportFilters } from "@/lib/simple-reports/catalog";

/**
 * GET — full-report PDF (all rows, same filters as Excel export).
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const report = String(searchParams.get("report") || "").trim();
    const from = String(searchParams.get("from") || "").trim().slice(0, 10);
    const to = String(searchParams.get("to") || "").trim().slice(0, 10);
    const sortByRaw = searchParams.get("sortBy");
    const sortBy = sortByRaw == null || sortByRaw === "" ? undefined : Number(sortByRaw);
    const sortDirRaw = String(searchParams.get("sortDir") || "").toLowerCase();
    const sortDir = sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : undefined;

    if (!isValidSimpleReportId(report)) {
      return NextResponse.json({ error: "Unknown report" }, { status: 400 });
    }

    const filters = parseReportFilters(report, searchParams);

    await connectDB();
    const result = await buildSimpleReportExport({
      report,
      ownerEmail: user.email.trim().toLowerCase(),
      from,
      to,
      filters,
      format: "pdf",
      sortBy: Number.isFinite(sortBy) ? sortBy : undefined,
      sortDir,
      subtitle: [from && `From ${from}`, to && `To ${to}`].filter(Boolean).join(" · "),
    });

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
        "X-Report-Row-Count": String(result.rowCount ?? 0),
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/simple-reports/pdf:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to build PDF" },
      { status: 500 }
    );
  }
}
