import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { buildSimpleReportExport } from "@/lib/simple-reports/builders";
import { isValidSimpleReportId, parseReportFilters } from "@/lib/simple-reports/catalog";

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
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize")) || 50));
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
      format: "json",
      page,
      pageSize,
      sortBy: Number.isFinite(sortBy) ? sortBy : undefined,
      sortDir,
    });

    return NextResponse.json(
      {
        sheetName: result.sheetName,
        filename: result.filename,
        rowCount: result.rowCount,
        headers: result.headers,
        rows: result.rows,
        amountColumns: result.amountColumns,
        amountTotals: result.amountTotals,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        sortBy: result.sortBy,
        sortDir: result.sortDir,
        defaultSortColumn: result.defaultSortColumn,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("GET /api/dashboard/simple-reports/view:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load report" },
      { status: 500 }
    );
  }
}
