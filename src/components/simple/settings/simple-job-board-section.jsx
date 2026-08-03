"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useAlert } from "@/components/confirm-provider";
import { USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";
import { resolveWorkOrderStatusTileProps } from "@/lib/work-order-status-tiles";
import {
  applySimpleBoardEvent,
  computeJobBoardColumns,
  resolveStatusToColumnKey,
} from "@/lib/simple-job-board";
import { SIMPLE_TAB_SERVICE_PROPOSALS } from "@/lib/simple-portal-tabs";

export default function SimpleJobBoardSection() {
  const alert = useAlert();
  const [jobs, setJobs] = useState([]);
  const [statusTileColors, setStatusTileColors] = useState({});
  const [boardColumns, setBoardColumns] = useState(() => [
    ...USER_SETTINGS_DEFAULTS.shopFloorBoardOrder,
  ]);
  const [canonicalWoStatuses, setCanonicalWoStatuses] = useState(() => [
    ...USER_SETTINGS_DEFAULTS.workOrderStatuses,
  ]);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);
  const [hideEmptyStatuses, setHideEmptyStatuses] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/simple-job-board", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load job board");
      setJobs(Array.isArray(data.jobs) ? data.jobs : Array.isArray(data.workOrders) ? data.workOrders : []);
      const canon =
        Array.isArray(data.workOrderStatuses) && data.workOrderStatuses.length
          ? [...data.workOrderStatuses]
          : [...USER_SETTINGS_DEFAULTS.workOrderStatuses];
      setCanonicalWoStatuses(canon);
      const order =
        Array.isArray(data.shopFloorBoardOrder) && data.shopFloorBoardOrder.length
          ? data.shopFloorBoardOrder
          : canon;
      setBoardColumns([...order]);
      setStatusTileColors(
        data.workOrderStatusTileColors && typeof data.workOrderStatusTileColors === "object"
          ? { ...data.workOrderStatusTileColors }
          : {}
      );
    } catch (e) {
      await alert({
        title: "Error",
        message: e.message || "Could not load job board",
        variant: "danger",
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return undefined;
    const es = new EventSource("/api/dashboard/job-board/events");
    es.onmessage = (ev) => {
      try {
        applySimpleBoardEvent(setJobs, JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [loading]);

  const columns = useMemo(
    () => computeJobBoardColumns(canonicalWoStatuses, boardColumns, jobs),
    [canonicalWoStatuses, boardColumns, jobs]
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(columns.map((s) => [s, []]));
    const fallback = columns[0] || "Assigned";
    for (const job of jobs) {
      const raw = String(job.status ?? "").trim();
      const key = raw ? resolveStatusToColumnKey(raw, columns) : fallback;
      if (map[key] === undefined) continue;
      map[key].push(job);
    }
    return map;
  }, [jobs, columns]);

  const displayColumns = useMemo(() => {
    if (!hideEmptyStatuses) return columns;
    return columns.filter((s) => (byStatus[s] || []).length > 0);
  }, [columns, byStatus, hideEmptyStatuses]);

  const boardGridClass = compact
    ? "grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] items-start gap-3 pb-4"
    : "grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] items-start gap-3 pb-4";

  const listClass = compact ? "flex flex-col gap-1 p-2" : "flex flex-col gap-2 p-2";

  const shareBoard = async () => {
    try {
      const res = await fetch("/api/dashboard/job-board", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get link");
      const url = data.url;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        await alert({ title: "Copied", message: "Job board link copied to clipboard." });
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (e) {
      await alert({
        title: "Error",
        message: e.message || "Failed to copy job board link",
        variant: "danger",
      });
    }
  };

  const boardBody = (
    <>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : displayColumns.length === 0 ? (
        <p className="text-sm text-secondary">
          {hideEmptyStatuses
            ? "No jobs on the board right now. Turn off “Hide empty statuses” to see all columns."
            : "No status columns to show. Configure statuses in Settings → Dropdowns."}
        </p>
      ) : (
        <div className={boardGridClass}>
          {displayColumns.map((status) => {
            const list = byStatus[status] || [];
            const colorIdx = columns.indexOf(status);
            const headerTile = resolveWorkOrderStatusTileProps(
              status,
              colorIdx >= 0 ? colorIdx : 0,
              statusTileColors
            );
            return (
              <div
                key={status}
                className="flex h-auto w-full min-w-0 flex-col rounded-none border border-border bg-card"
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <span
                    className={`job-board-status-pill inline-flex max-w-[min(100%,220px)] items-center truncate rounded-full px-2.5 py-0.5 text-xs font-semibold sm:max-w-[min(100%,260px)] ${headerTile.className}`}
                    style={headerTile.style}
                    title={status}
                  >
                    {status}
                  </span>
                  <p className="whitespace-nowrap text-[11px] text-secondary">
                    {list.length} job(s)
                  </p>
                </div>
                <div className={listClass}>
                  {list.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-secondary">—</p>
                  ) : (
                    list.map((job) => {
                      const href = `/dashboards?tab=${SIMPLE_TAB_SERVICE_PROPOSALS}&open=${encodeURIComponent(job.id)}`;
                      const cardClass = compact
                        ? "block rounded-none border border-border bg-bg px-2 py-1 text-left text-xs shadow-sm transition-colors hover:border-primary/40 hover:bg-card"
                        : "block rounded-none border border-border bg-bg p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-card";
                      return (
                        <Link key={job.id} href={href} className={cardClass} onClick={() => setFullscreen(false)}>
                          {compact ? (
                            <p className="truncate text-xs text-title">
                              <span className="font-mono font-semibold text-primary">
                                {job.workOrderNumber}
                              </span>
                              <span className="mx-1 text-secondary">·</span>
                              <span className="text-sm font-semibold text-title">
                                {job.customerCompany || job.companyName || "—"}
                              </span>
                            </p>
                          ) : (
                            <>
                              <p className="font-mono text-sm font-semibold text-primary">
                                {job.workOrderNumber}
                              </p>
                              <p className="mt-0.5 truncate text-base font-semibold text-title">
                                {job.customerCompany || job.companyName || "—"}
                              </p>
                              <p className="mt-1 text-xs text-secondary">{job.motorClass}</p>
                            </>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setCompact((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-none border px-3 py-1 text-xs font-medium transition-colors ${
          compact
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-secondary hover:border-primary/40 hover:text-primary"
        }`}
      >
        {compact ? "Compact view" : "Standard view"}
      </button>
      <button
        type="button"
        onClick={() => setHideEmptyStatuses((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-none border px-3 py-1 text-xs font-medium transition-colors ${
          hideEmptyStatuses
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-secondary hover:border-primary/40 hover:text-primary"
        }`}
      >
        {hideEmptyStatuses ? "Show empty statuses" : "Hide empty statuses"}
      </button>
      <Button type="button" size="sm" variant="outline" onClick={shareBoard}>
        Share board
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setFullscreen((v) => !v)}
        className="inline-flex items-center gap-1.5"
        aria-pressed={fullscreen}
      >
        {fullscreen ? (
          <>
            <FiMinimize2 className="h-4 w-4 shrink-0" />
            Exit full screen
          </>
        ) : (
          <>
            <FiMaximize2 className="h-4 w-4 shrink-0" />
            Full screen
          </>
        )}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={load} disabled={loading}>
        Refresh
      </Button>
    </div>
  );

  const inline = (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-8">
      <FormContainer>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <FormSectionTitle as="h2">Shop floor job board</FormSectionTitle>
            <p className="mt-1 text-sm text-secondary">
              Kanban of Simple JOB service proposals by Job Status. Columns follow Settings →
              Dropdowns (Shop floor toggle).
            </p>
          </div>
          {toolbar}
        </div>
      </FormContainer>
      {boardBody}
    </div>
  );

  const fullscreenUi =
    mounted && fullscreen
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-bg"
            role="dialog"
            aria-modal="true"
            aria-label="Shop floor job board full screen"
          >
            <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
              <div>
                <h2 className="text-xl font-bold text-title">Shop floor job board</h2>
                <p className="mt-0.5 text-sm text-secondary">
                  Full screen · Esc to exit
                </p>
              </div>
              {toolbar}
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">{boardBody}</div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {inline}
      {fullscreenUi}
    </>
  );
}
