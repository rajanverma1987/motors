"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiDownload, FiEye } from "react-icons/fi";
import Button from "@/components/ui/button";
import SimpleSelect from "@/components/simple/simple-select";
import SimpleReportViewModal from "@/components/simple/simple-report-view-modal";
import { useAlert } from "@/components/confirm-provider";
import { SIMPLE_REPORT_CATALOG } from "@/lib/simple-reports/catalog";
import {
  ALL_JOBS_DATE_FROM_PARAM,
  ALL_JOBS_DATE_TO_PARAM,
  parseAllJobsDateRange,
} from "@/lib/all-jobs-date-filter";
import { useFormatDate } from "@/contexts/user-settings-context";
import { SIMPLE_PORTAL_ROOT_CLASS } from "@/lib/simple-screen-ui";
import { nativeShareFile } from "@/lib/mobile-native-share";

const CATEGORY_ORDER = ["Accounting", "Operations", "Sales"];

function emptyFiltersForCatalog() {
  /** @type {Record<string, Record<string, string>>} */
  const map = {};
  for (const report of SIMPLE_REPORT_CATALOG) {
    map[report.id] = {};
    for (const f of report.filters || []) {
      map[report.id][f.key] = "";
    }
  }
  return map;
}

/**
 * Simple portal Reports — Excel downloads + on-screen preview.
 */
export default function ReportsPanel() {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const searchParams = useSearchParams();
  const { from, to } = parseAllJobsDateRange(searchParams);
  const [busyId, setBusyId] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [filtersByReport, setFiltersByReport] = useState(emptyFiltersForCatalog);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewReportId, setViewReportId] = useState("");
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);
  const [viewPage, setViewPage] = useState(1);
  const [viewPageSize, setViewPageSize] = useState(50);
  const [viewSortBy, setViewSortBy] = useState(null);
  const [viewSortDir, setViewSortDir] = useState("desc");

  const setFilter = useCallback((reportId, key, value) => {
    setFiltersByReport((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || {}),
        [key]: String(value ?? ""),
      },
    }));
  }, []);

  const buildReportParams = useCallback(
    (reportId) => {
      const id = String(reportId || "").trim();
      const params = new URLSearchParams({ report: id });
      if (from) params.set(ALL_JOBS_DATE_FROM_PARAM, from);
      if (to) params.set(ALL_JOBS_DATE_TO_PARAM, to);
      const reportFilters = filtersByReport[id] || {};
      for (const [key, value] of Object.entries(reportFilters)) {
        if (value) params.set(key, value);
      }
      return params;
    },
    [filtersByReport, from, to]
  );

  const downloadReport = useCallback(
    async (reportId) => {
      const id = String(reportId || "").trim();
      if (!id || busyId) return;
      setBusyId(id);
      setBusyAction("download");
      try {
        const params = buildReportParams(id);
        const res = await fetch(`/api/dashboard/simple-reports/export?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Download failed");
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const match = /filename="([^"]+)"/i.exec(disposition);
        const filename = match?.[1] || `${id}.xlsx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to download report.",
          variant: "danger",
        });
      } finally {
        setBusyId("");
        setBusyAction("");
      }
    },
    [alert, buildReportParams, busyId]
  );

  const shareReportPdf = useCallback(
    async (reportId) => {
      const id = String(reportId || "").trim();
      if (!id || busyId) return;
      setBusyId(id);
      setBusyAction("share");
      try {
        const params = buildReportParams(id);
        if (viewSortBy != null && Number.isFinite(Number(viewSortBy))) {
          params.set("sortBy", String(Number(viewSortBy)));
        }
        if (viewSortDir === "asc" || viewSortDir === "desc") {
          params.set("sortDir", viewSortDir);
        }
        const res = await fetch(`/api/dashboard/simple-reports/pdf?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to build PDF");
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const match = /filename="([^"]+)"/i.exec(disposition);
        const filename = match?.[1] || `${id}.pdf`;
        const catalog = SIMPLE_REPORT_CATALOG.find((r) => r.id === id);
        await nativeShareFile({
          blob,
          filename,
          title: catalog?.title || "Report",
          text: `${catalog?.title || "Report"} PDF from IQMotorBase`,
        });
      } catch (err) {
        if (err?.name === "AbortError") return;
        await alert({
          title: "Share failed",
          message: err?.message || "Could not share this report.",
          variant: "danger",
        });
      } finally {
        setBusyId("");
        setBusyAction("");
      }
    },
    [alert, buildReportParams, busyId, viewSortBy, viewSortDir]
  );

  const loadViewPage = useCallback(
    async (reportId, { page, pageSize, sortBy, sortDir, showBusy = true } = {}) => {
      const id = String(reportId || "").trim();
      if (!id) return;
      if (showBusy) {
        setBusyId(id);
        setBusyAction("view");
      }
      setViewLoading(true);
      setViewError("");
      try {
        const params = buildReportParams(id);
        params.set("page", String(Math.max(1, Number(page) || 1)));
        params.set("pageSize", String(Math.min(200, Math.max(1, Number(pageSize) || 50))));
        if (sortBy != null && Number.isFinite(Number(sortBy))) {
          params.set("sortBy", String(Number(sortBy)));
        }
        if (sortDir === "asc" || sortDir === "desc") {
          params.set("sortDir", sortDir);
        }
        const res = await fetch(`/api/dashboard/simple-reports/view?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load report");
        setViewData(data);
        setViewPage(Number(data.page) || 1);
        setViewPageSize(Number(data.pageSize) || 50);
        setViewSortBy(Number.isFinite(Number(data.sortBy)) ? Number(data.sortBy) : null);
        setViewSortDir(data.sortDir === "asc" ? "asc" : "desc");
      } catch (err) {
        setViewError(err?.message || "Failed to load report.");
      } finally {
        setViewLoading(false);
        if (showBusy) {
          setBusyId("");
          setBusyAction("");
        }
      }
    },
    [buildReportParams]
  );

  const viewReport = useCallback(
    async (reportId) => {
      const id = String(reportId || "").trim();
      if (!id || busyId) return;
      setViewReportId(id);
      setViewOpen(true);
      setViewData(null);
      setViewPage(1);
      setViewPageSize(50);
      setViewSortBy(null);
      setViewSortDir("desc");
      await loadViewPage(id, {
        page: 1,
        pageSize: 50,
        sortBy: null,
        sortDir: "desc",
        showBusy: true,
      });
    },
    [busyId, loadViewPage]
  );

  const closeView = useCallback(() => {
    setViewOpen(false);
    setViewReportId("");
    setViewError("");
    setViewData(null);
    setViewLoading(false);
    setViewPage(1);
    setViewSortBy(null);
    setViewSortDir("desc");
  }, []);

  const handleViewPageChange = useCallback(
    (nextPage, nextPageSize) => {
      if (!viewReportId) return;
      void loadViewPage(viewReportId, {
        page: nextPage,
        pageSize: nextPageSize,
        sortBy: viewSortBy,
        sortDir: viewSortDir,
        showBusy: false,
      });
    },
    [loadViewPage, viewReportId, viewSortBy, viewSortDir]
  );

  const handleViewSortChange = useCallback(
    (colIdx, dir) => {
      if (!viewReportId) return;
      void loadViewPage(viewReportId, {
        page: 1,
        pageSize: viewPageSize,
        sortBy: colIdx,
        sortDir: dir,
        showBusy: false,
      });
    },
    [loadViewPage, viewPageSize, viewReportId]
  );

  const rangeLabel = useMemo(() => {
    if (!from && !to) return "All dates";
    const left = from ? formatDate(from) : "…";
    const right = to ? formatDate(to) : "…";
    return `${left} → ${right}`;
  }, [formatDate, from, to]);

  const groupedReports = useMemo(() => {
    /** @type {Map<string, typeof SIMPLE_REPORT_CATALOG>} */
    const map = new Map();
    for (const report of SIMPLE_REPORT_CATALOG) {
      const cat = String(report.category || "Other").trim() || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(report);
    }
    const keys = [
      ...CATEGORY_ORDER.filter((c) => map.has(c)),
      ...[...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
    ];
    return keys.map((category) => ({ category, reports: map.get(category) || [] }));
  }, []);

  const viewCatalog = useMemo(
    () => SIMPLE_REPORT_CATALOG.find((r) => r.id === viewReportId) || null,
    [viewReportId]
  );

  const viewTitle = useMemo(() => {
    if (!viewCatalog) return "Report";
    return viewCatalog.usesDateRange
      ? `${viewCatalog.title} — Date Range: ${rangeLabel}`
      : `${viewCatalog.title} — Full snapshot`;
  }, [rangeLabel, viewCatalog]);

  return (
    <div className={`${SIMPLE_PORTAL_ROOT_CLASS} flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto`}>
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-semibold tracking-tight text-title">Reports</h2>
        <p className="mt-1 text-sm text-secondary">
          View or download Excel reports for your shop data. Date-filtered reports use Date Range:{" "}
          <span className="font-medium text-title">{rangeLabel}</span>.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groupedReports.map(({ category, reports }) => (
          <section key={category} className="min-w-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
              {category}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => {
                const busy = busyId === report.id;
                const filters = report.filters || [];
                const values = filtersByReport[report.id] || {};
                const title = report.usesDateRange
                  ? `${report.title} — Date Range: ${rangeLabel}`
                  : `${report.title} — Full snapshot`;

                return (
                  <div key={report.id} className="simple-report-card">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold leading-snug tracking-tight text-title">
                          {title}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-secondary">
                          {report.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold"
                          disabled={Boolean(busyId)}
                          onClick={() => viewReport(report.id)}
                          title="View report"
                        >
                          <FiEye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {busy && busyAction === "view" ? "…" : "View"}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold"
                          disabled={Boolean(busyId)}
                          onClick={() => downloadReport(report.id)}
                          title="Download Excel"
                        >
                          <FiDownload className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {busy && busyAction === "download" ? "…" : "Excel"}
                        </Button>
                      </div>
                    </div>

                    {filters.length > 0 ? (
                      <div
                        className={
                          filters.length > 1
                            ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
                            : "grid gap-2"
                        }
                      >
                        {filters.map((filter) => (
                          <label key={filter.key} className="grid min-w-0 gap-1">
                            <span className="text-[11px] font-medium text-secondary">
                              {filter.label}
                            </span>
                            <SimpleSelect
                              aria-label={`${report.title} ${filter.label}`}
                              options={filter.options}
                              value={values[filter.key] ?? ""}
                              onChange={(e) => setFilter(report.id, filter.key, e.target.value)}
                              searchable={false}
                              disabled={Boolean(busyId)}
                            />
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <SimpleReportViewModal
        open={viewOpen}
        onClose={closeView}
        title={viewTitle}
        loading={viewLoading}
        error={viewError}
        sheetName={viewData?.sheetName || ""}
        headers={viewData?.headers || []}
        rows={viewData?.rows || []}
        amountColumns={viewData?.amountColumns || []}
        amountTotals={viewData?.amountTotals || []}
        rowCount={viewData?.rowCount || 0}
        page={viewPage}
        pageSize={viewPageSize}
        totalPages={viewData?.totalPages || 1}
        sortBy={viewSortBy ?? viewData?.sortBy ?? 0}
        sortDir={viewSortDir}
        onPageChange={handleViewPageChange}
        onSortChange={handleViewSortChange}
        downloading={busyId === viewReportId && busyAction === "download"}
        sharing={busyId === viewReportId && busyAction === "share"}
        onDownload={viewReportId ? () => downloadReport(viewReportId) : undefined}
        onShare={viewReportId ? () => shareReportPdf(viewReportId) : undefined}
      />
    </div>
  );
}
