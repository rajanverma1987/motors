"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";
import { useToast } from "@/components/toast-provider";
import { mergeUserSettings, USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";

/**
 * Status pills: light = soft grey chip + text in that status hue; dark = unchanged soft tint.
 */
const STATUS_TITLE_PALETTE = [
  "bg-neutral-200 text-sky-700 ring-1 ring-neutral-300/90 dark:bg-sky-400/15 dark:text-sky-100 dark:ring-sky-400/30",
  "bg-neutral-200 text-violet-700 ring-1 ring-neutral-300/90 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/30",
  "bg-neutral-200 text-emerald-700 ring-1 ring-neutral-300/90 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/30",
  "bg-neutral-200 text-rose-700 ring-1 ring-neutral-300/90 dark:bg-rose-400/15 dark:text-rose-100 dark:ring-rose-400/30",
  "bg-neutral-200 text-amber-800 ring-1 ring-neutral-300/90 dark:bg-amber-400/15 dark:text-amber-50 dark:ring-amber-400/30",
  "bg-neutral-200 text-cyan-700 ring-1 ring-neutral-300/90 dark:bg-cyan-400/15 dark:text-cyan-100 dark:ring-cyan-400/30",
  "bg-neutral-200 text-fuchsia-700 ring-1 ring-neutral-300/90 dark:bg-fuchsia-400/15 dark:text-fuchsia-100 dark:ring-fuchsia-400/30",
  "bg-neutral-200 text-lime-800 ring-1 ring-neutral-300/90 dark:bg-lime-400/15 dark:text-lime-50 dark:ring-lime-400/30",
  "bg-neutral-200 text-teal-700 ring-1 ring-neutral-300/90 dark:bg-teal-400/15 dark:text-teal-100 dark:ring-teal-400/30",
  "bg-neutral-200 text-indigo-700 ring-1 ring-neutral-300/90 dark:bg-indigo-400/15 dark:text-indigo-100 dark:ring-indigo-400/30",
  "bg-neutral-200 text-orange-700 ring-1 ring-neutral-300/90 dark:bg-orange-400/15 dark:text-orange-100 dark:ring-orange-400/30",
  "bg-neutral-200 text-pink-700 ring-1 ring-neutral-300/90 dark:bg-pink-400/15 dark:text-pink-100 dark:ring-pink-400/30",
  "bg-neutral-200 text-blue-700 ring-1 ring-neutral-300/90 dark:bg-blue-400/15 dark:text-blue-100 dark:ring-blue-400/30",
  "bg-neutral-200 text-green-700 ring-1 ring-neutral-300/90 dark:bg-green-400/15 dark:text-green-100 dark:ring-green-400/30",
  "bg-neutral-200 text-red-700 ring-1 ring-neutral-300/90 dark:bg-red-400/15 dark:text-red-100 dark:ring-red-400/30",
  "bg-neutral-200 text-purple-700 ring-1 ring-neutral-300/90 dark:bg-purple-400/15 dark:text-purple-100 dark:ring-purple-400/30",
  "bg-neutral-200 text-yellow-800 ring-1 ring-neutral-300/90 dark:bg-yellow-400/15 dark:text-yellow-50 dark:ring-yellow-400/30",
  "bg-neutral-200 text-stone-700 ring-1 ring-neutral-300/90 dark:bg-stone-400/15 dark:text-stone-100 dark:ring-stone-400/30",
  "bg-neutral-200 text-slate-700 ring-1 ring-neutral-300/90 dark:bg-slate-400/15 dark:text-slate-100 dark:ring-slate-400/30",
  "bg-neutral-200 text-rose-800 ring-1 ring-neutral-300/90 dark:bg-rose-500/12 dark:text-rose-100 dark:ring-rose-500/25",
  "bg-neutral-200 text-sky-800 ring-1 ring-neutral-300/90 dark:bg-sky-500/12 dark:text-sky-100 dark:ring-sky-500/25",
  "bg-neutral-200 text-teal-800 ring-1 ring-neutral-300/90 dark:bg-teal-500/12 dark:text-teal-100 dark:ring-teal-500/25",
  "bg-neutral-200 text-purple-800 ring-1 ring-neutral-300/90 dark:bg-purple-500/12 dark:text-purple-100 dark:ring-purple-500/25",
  "bg-neutral-200 text-orange-800 ring-1 ring-neutral-300/90 dark:bg-orange-500/12 dark:text-orange-100 dark:ring-orange-500/25",
];

function statusTitleColorClass(columnIndexInOrder) {
  const n = STATUS_TITLE_PALETTE.length;
  const i =
    typeof columnIndexInOrder === "number" && columnIndexInOrder >= 0
      ? columnIndexInOrder % n
      : 0;
  return STATUS_TITLE_PALETTE[i];
}

function applyBoardEvent(setWorkOrders, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "workOrderUpdated" && msg.workOrder?.id) {
    setWorkOrders((prev) => {
      const i = prev.findIndex((w) => w.id === msg.workOrder.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], ...msg.workOrder };
        return next;
      }
      return [...prev, msg.workOrder];
    });
  } else if (msg.type === "workOrderCreated" && msg.workOrder?.id) {
    setWorkOrders((prev) => {
      if (prev.some((w) => w.id === msg.workOrder.id)) return prev;
      return [msg.workOrder, ...prev];
    });
  } else if (msg.type === "workOrderDeleted" && msg.id) {
    setWorkOrders((prev) => prev.filter((w) => w.id !== msg.id));
  }
}

export default function JobBoardClient({
  initialWorkOrders,
  initialBoardOrder,
  publicMode = false,
  shareToken = "",
} = {}) {
  const toast = useToast();
  const [workOrders, setWorkOrders] = useState(() =>
    Array.isArray(initialWorkOrders) ? initialWorkOrders : []
  );
  const [boardColumns, setBoardColumns] = useState(() => {
    if (Array.isArray(initialBoardOrder) && initialBoardOrder.length) return [...initialBoardOrder];
    return [...USER_SETTINGS_DEFAULTS.shopFloorBoardOrder];
  });
  const [loading, setLoading] = useState(!publicMode || !Array.isArray(initialWorkOrders));
  const [compact, setCompact] = useState(false);
  const [hideEmptyStatuses, setHideEmptyStatuses] = useState(false);

  const load = useCallback(async () => {
    if (publicMode) return;
    setLoading(true);
    try {
      const [woRes, setRes] = await Promise.all([
        fetch("/api/dashboard/work-orders", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/settings", { credentials: "include", cache: "no-store" }),
      ]);
      if (woRes.ok) setWorkOrders(await woRes.json());
      if (setRes.ok) {
        const d = await setRes.json();
        const u = mergeUserSettings(d.settings);
        const order = u.shopFloorBoardOrder?.length ? u.shopFloorBoardOrder : u.workOrderStatuses;
        setBoardColumns(Array.isArray(order) && order.length ? order : u.workOrderStatuses);
      }
    } finally {
      setLoading(false);
    }
  }, [publicMode]);

  useEffect(() => {
    if (!publicMode) load();
  }, [load, publicMode]);

  useEffect(() => {
    if (!publicMode) return;
    if (Array.isArray(initialWorkOrders)) setWorkOrders(initialWorkOrders);
    if (Array.isArray(initialBoardOrder) && initialBoardOrder.length) {
      setBoardColumns([...initialBoardOrder]);
    }
  }, [publicMode, initialWorkOrders, initialBoardOrder]);

  // Live updates via SSE when work orders change (no polling)
  useEffect(() => {
    if (loading) return;
    if (publicMode) {
      const t = String(shareToken || "").trim();
      if (!t) return;
      const es = new EventSource(
        `/api/job-board/events?token=${encodeURIComponent(t)}`
      );
      es.onmessage = (ev) => {
        try {
          applyBoardEvent(setWorkOrders, JSON.parse(ev.data));
        } catch {
          /* ignore */
        }
      };
      return () => es.close();
    }
    const es = new EventSource("/api/dashboard/job-board/events");
    es.onmessage = (ev) => {
      try {
        applyBoardEvent(setWorkOrders, JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [publicMode, shareToken, loading]);

  const columns = useMemo(() => {
    const base = [...boardColumns];
    const seen = new Set(base);
    for (const wo of workOrders) {
      const s = wo.status?.trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        base.push(s);
      }
    }
    return base;
  }, [boardColumns, workOrders]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(columns.map((s) => [s, []]));
    for (const wo of workOrders) {
      const s = wo.status?.trim() || columns[0] || "Assigned";
      if (!map[s]) map[s] = [];
      map[s].push(wo);
    }
    return map;
  }, [workOrders, columns]);

  const displayColumns = useMemo(() => {
    if (!hideEmptyStatuses) return columns;
    return columns.filter((s) => (byStatus[s] || []).length > 0);
  }, [columns, byStatus, hideEmptyStatuses]);

  /** Full-viewport column strip (share board has no dashboard chrome). */
  const boardMinH = publicMode
    ? "min-h-[calc(100dvh-10.5rem)]"
    : "min-h-[calc(100dvh-13rem)]";

  const containerClass = compact
    ? `flex min-h-0 flex-1 flex-wrap content-stretch gap-3 overflow-auto pb-4 [align-items:stretch] ${boardMinH}`
    : `flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-4 ${boardMinH}`;

  /** Compact: ~5 columns per row (shared row width minus 4× gap-3). */
  const columnClass = compact
    ? "flex min-h-0 h-full w-full shrink-0 flex-col rounded-lg border border-border bg-card sm:w-[calc((100%-3rem)/5)]"
    : "flex min-h-0 h-full w-[min(100%,280px)] shrink-0 flex-col rounded-lg border border-border bg-card";

  const listClass = compact
    ? "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2"
    : "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2";

  const rootClass = publicMode
    ? "mx-auto flex min-h-dvh w-full max-w-[100vw] flex-1 flex-col overflow-hidden bg-bg px-4 py-4 sm:px-6 sm:py-6"
    : "mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-4 py-6";

  return (
    <div className={rootClass}>
      <div className="mb-4 shrink-0 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Shop floor job board
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-secondary">
            Columns follow Settings → Work order statuses (shop floor order). Other statuses appear after if jobs use them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCompact((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              compact
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-secondary hover:border-primary/40 hover:text-primary"
            }`}
          >
            <span>{compact ? "Compact view" : "Standard view"}</span>
          </button>
          <button
            type="button"
            onClick={() => setHideEmptyStatuses((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              hideEmptyStatuses
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-secondary hover:border-primary/40 hover:text-primary"
            }`}
          >
            {hideEmptyStatuses ? "Show empty statuses" : "Hide empty statuses"}
          </button>
          {publicMode && <ThemeToggle />}
          {!publicMode && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/dashboard/job-board", {
                      credentials: "include",
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to get link");
                    const url = data.url;
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(url);
                      toast.success("Job board link copied to clipboard.");
                    } else {
                      toast.success("Job board link ready.");
                      window.prompt("Copy this link:", url);
                    }
                  } catch (e) {
                    toast.error(e.message || "Failed to copy job board link");
                  }
                }}
              >
                Share board
              </Button>
              <Link
                href="/dashboard/work-orders"
                className="text-sm font-medium text-primary hover:underline"
              >
                Work orders list →
              </Link>
            </>
          )}
        </div>
      </div>
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : displayColumns.length === 0 ? (
        <p className="text-sm text-secondary">
          {hideEmptyStatuses
            ? "No jobs on the board right now. Turn off “Hide empty statuses” to see all columns."
            : "No status columns to show."}
        </p>
      ) : (
        <div className={containerClass}>
          {displayColumns.map((status) => {
            const list = byStatus[status] || [];
            const colorIdx = columns.indexOf(status);
            return (
              <div
                key={status}
                className={columnClass}
              >
                <div className="shrink-0 border-b border-border px-3 py-2 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex max-w-[min(100%,220px)] items-center truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset sm:max-w-[min(100%,260px)] ${statusTitleColorClass(colorIdx >= 0 ? colorIdx : 0)}`}
                    title={status}
                  >
                    {status}
                  </span>
                  <p className="text-[11px] text-secondary whitespace-nowrap">{list.length} job(s)</p>
                </div>
                <div className={listClass}>
                  {list.length === 0 ? (
                    <p className="flex flex-1 items-center justify-center px-1 py-8 text-center text-xs text-secondary">
                      —
                    </p>
                  ) : (
                    list.map((wo) => {
                      const cardClass =
                        compact
                          ? "block rounded border border-border bg-bg px-2 py-1 text-left text-xs shadow-sm transition-colors hover:border-primary/40 hover:bg-card"
                          : "block rounded-md border border-border bg-bg p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-card";
                      const inner =
                        compact ? (
                          <p className="truncate text-xs text-title">
                            <span className="font-mono font-semibold text-primary">
                              {wo.workOrderNumber}
                            </span>
                            <span className="mx-1 text-secondary">·</span>
                            <span>{wo.customerCompany || wo.companyName || "—"}</span>
                          </p>
                        ) : (
                          <>
                            <p className="font-mono text-sm font-semibold text-primary">
                              {wo.workOrderNumber}
                            </p>
                            <p className="mt-1 text-xs text-secondary">{wo.quoteRfqNumber || "—"}</p>
                            <p className="mt-0.5 truncate text-sm text-title">
                              {wo.customerCompany || wo.companyName || "—"}
                            </p>
                            <p className="mt-1 text-xs text-secondary">{wo.motorClass} motor</p>
                          </>
                        );
                      return publicMode ? (
                        <div key={wo.id} className={cardClass}>
                          {inner}
                        </div>
                      ) : (
                        <Link
                          key={wo.id}
                          href={`/dashboard/work-orders?open=${wo.id}`}
                          className={cardClass}
                        >
                          {inner}
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
    </div>
  );
}
