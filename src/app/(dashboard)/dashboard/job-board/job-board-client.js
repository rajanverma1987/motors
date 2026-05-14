"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";
import { useToast } from "@/components/toast-provider";
import { mergeUserSettings, USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";
import { resolveWorkOrderStatusTileClass } from "@/lib/work-order-status-tiles";

/**
 * Column order always follows Settings → Dropdowns (canonical) row order.
 * Stored `shopFloorBoardOrder` only limits which statuses appear when it is a strict subset
 * of canonical; any status used on a work order is included and slotted by canonical order
 * (never appended in API / “first seen” order).
 */
function computeJobBoardColumns(canonical, boardSubset, workOrders) {
  const canon = Array.isArray(canonical)
    ? canonical.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  const board = Array.isArray(boardSubset)
    ? boardSubset.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  const woList = Array.isArray(workOrders) ? workOrders : [];

  if (!canon.length) {
    const fromBoard = board.length ? [...board] : [];
    const seen = new Set(fromBoard.map((s) => s.toLowerCase()));
    const tail = [];
    for (const wo of woList) {
      const s = String(wo.status ?? "").trim();
      if (!s) continue;
      const sl = s.toLowerCase();
      if (!seen.has(sl)) {
        seen.add(sl);
        tail.push(s);
      }
    }
    return [...fromBoard, ...tail];
  }

  const canonLowerSet = new Set(canon.map((c) => c.toLowerCase()));
  const boardLowerSet = new Set(board.map((b) => b.toLowerCase()));

  const sameStatusSetAsCanon =
    boardLowerSet.size === canonLowerSet.size &&
    [...canonLowerSet].every((c) => boardLowerSet.has(c));

  const fullBoardSignal =
    !board.length || board.length >= canon.length || sameStatusSetAsCanon;

  const pickLower = new Set();
  if (fullBoardSignal) {
    for (const c of canon) pickLower.add(c.toLowerCase());
  } else {
    for (const b of board) pickLower.add(b.toLowerCase());
  }
  for (const wo of woList) {
    const sl = String(wo.status ?? "").trim().toLowerCase();
    if (sl) pickLower.add(sl);
  }

  const ordered = canon.filter((c) => pickLower.has(c.toLowerCase()));

  const seenLower = new Set(ordered.map((s) => s.toLowerCase()));
  const unknownTail = [];
  for (const wo of woList) {
    const s = String(wo.status ?? "").trim();
    if (!s) continue;
    const sl = s.toLowerCase();
    if (!canonLowerSet.has(sl) && !seenLower.has(sl)) {
      seenLower.add(sl);
      unknownTail.push(s);
    }
  }
  return [...ordered, ...unknownTail];
}

function resolveStatusToColumnKey(status, columnTitles) {
  const t = String(status ?? "").trim();
  if (!t) return "";
  const tl = t.toLowerCase();
  for (const col of columnTitles) {
    if (String(col ?? "").trim().toLowerCase() === tl) return String(col).trim();
  }
  return t;
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
  initialWorkOrderStatuses,
  initialStatusTileColors,
  publicMode = false,
  shareToken = "",
} = {}) {
  const toast = useToast();
  const [workOrders, setWorkOrders] = useState(() =>
    Array.isArray(initialWorkOrders) ? initialWorkOrders : []
  );
  const [statusTileColors, setStatusTileColors] = useState(() =>
    initialStatusTileColors && typeof initialStatusTileColors === "object" && !Array.isArray(initialStatusTileColors)
      ? { ...initialStatusTileColors }
      : {}
  );
  const [boardColumns, setBoardColumns] = useState(() => {
    if (Array.isArray(initialBoardOrder) && initialBoardOrder.length) return [...initialBoardOrder];
    return [...USER_SETTINGS_DEFAULTS.shopFloorBoardOrder];
  });
  const [canonicalWoStatuses, setCanonicalWoStatuses] = useState(() =>
    Array.isArray(initialWorkOrderStatuses) && initialWorkOrderStatuses.length
      ? [...initialWorkOrderStatuses]
      : [...USER_SETTINGS_DEFAULTS.workOrderStatuses]
  );
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
      if (woRes.ok) {
        const raw = await woRes.json();
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        setWorkOrders(list);
      }
      if (setRes.ok) {
        const d = await setRes.json();
        const u = mergeUserSettings(d.settings);
        const canon =
          Array.isArray(u.workOrderStatuses) && u.workOrderStatuses.length
            ? [...u.workOrderStatuses]
            : [...USER_SETTINGS_DEFAULTS.workOrderStatuses];
        setCanonicalWoStatuses(canon);
        const order = u.shopFloorBoardOrder?.length ? u.shopFloorBoardOrder : u.workOrderStatuses;
        setBoardColumns(Array.isArray(order) && order.length ? order : canon);
        setStatusTileColors(
          u.workOrderStatusTileColors && typeof u.workOrderStatusTileColors === "object"
            ? { ...u.workOrderStatusTileColors }
            : {}
        );
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
    if (Array.isArray(initialWorkOrderStatuses) && initialWorkOrderStatuses.length) {
      setCanonicalWoStatuses([...initialWorkOrderStatuses]);
    }
    if (
      initialStatusTileColors &&
      typeof initialStatusTileColors === "object" &&
      !Array.isArray(initialStatusTileColors)
    ) {
      setStatusTileColors({ ...initialStatusTileColors });
    }
  }, [
    publicMode,
    initialWorkOrders,
    initialBoardOrder,
    initialWorkOrderStatuses,
    initialStatusTileColors,
  ]);

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

  const columns = useMemo(
    () => computeJobBoardColumns(canonicalWoStatuses, boardColumns, workOrders),
    [canonicalWoStatuses, boardColumns, workOrders]
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(columns.map((s) => [s, []]));
    const fallback = columns[0] || "Assigned";
    for (const wo of workOrders) {
      const raw = String(wo.status ?? "").trim();
      let key = raw ? resolveStatusToColumnKey(raw, columns) : fallback;
      if (map[key] === undefined) key = fallback;
      map[key].push(wo);
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-title">
            Shop floor job board
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-secondary">
            Kanban columns follow your work order statuses in Settings → Dropdowns (order with ↑ / ↓).
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
                    className={`job-board-status-pill inline-flex max-w-[min(100%,220px)] items-center truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset sm:max-w-[min(100%,260px)] ${resolveWorkOrderStatusTileClass(status, colorIdx >= 0 ? colorIdx : 0, statusTileColors)}`}
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
