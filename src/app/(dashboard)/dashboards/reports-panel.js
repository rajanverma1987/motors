"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiDownload } from "react-icons/fi";
import Button from "@/components/ui/button";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import { SIMPLE_REPORT_CATALOG } from "@/lib/simple-reports/catalog";
import {
  ALL_JOBS_DATE_FROM_PARAM,
  ALL_JOBS_DATE_TO_PARAM,
  parseAllJobsDateRange,
} from "@/lib/all-jobs-date-filter";
import { useFormatDate } from "@/contexts/user-settings-context";

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
 * Simple portal Reports — Excel downloads for shop data.
 */
export default function ReportsPanel() {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const searchParams = useSearchParams();
  const { from, to } = parseAllJobsDateRange(searchParams);
  const [busyId, setBusyId] = useState("");
  const [filtersByReport, setFiltersByReport] = useState(emptyFiltersForCatalog);

  const setFilter = useCallback((reportId, key, value) => {
    setFiltersByReport((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || {}),
        [key]: String(value ?? ""),
      },
    }));
  }, []);

  const downloadReport = useCallback(
    async (reportId) => {
      const id = String(reportId || "").trim();
      if (!id || busyId) return;
      setBusyId(id);
      try {
        const params = new URLSearchParams({ report: id });
        if (from) params.set(ALL_JOBS_DATE_FROM_PARAM, from);
        if (to) params.set(ALL_JOBS_DATE_TO_PARAM, to);
        const reportFilters = filtersByReport[id] || {};
        for (const [key, value] of Object.entries(reportFilters)) {
          if (value) params.set(key, value);
        }
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
      }
    },
    [alert, busyId, filtersByReport, from, to]
  );

  const rangeLabel = useMemo(() => {
    if (!from && !to) return "All dates";
    const left = from ? formatDate(from) : "…";
    const right = to ? formatDate(to) : "…";
    return `${left} → ${right}`;
  }, [formatDate, from, to]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="mb-5 shrink-0">
        <h2 className="text-2xl font-semibold tracking-tight text-title">Reports</h2>
        <p className="mt-1 text-sm text-secondary">
          Excel downloads for your Simple portal data. Date-filtered reports use the hub range:{" "}
          <span className="font-medium text-title">{rangeLabel}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SIMPLE_REPORT_CATALOG.map((report) => {
          const busy = busyId === report.id;
          const filters = report.filters || [];
          const values = filtersByReport[report.id] || {};

          return (
            <div
              key={report.id}
              className="flex min-h-0 flex-col gap-3 rounded-sm border border-border bg-card/40 p-4 dark:bg-card/20"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold leading-snug tracking-tight text-title">
                    {report.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-secondary">{report.description}</p>
                </div>
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
                  {busy ? "…" : "Excel"}
                </Button>
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
                      <span className="text-[11px] font-medium text-secondary">{filter.label}</span>
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

              <p className="mt-auto text-[11px] text-secondary">
                {report.usesDateRange ? (
                  <>
                    Hub date range: <span className="font-medium text-title">{rangeLabel}</span>
                  </>
                ) : (
                  "Full snapshot (ignores hub date range)"
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
