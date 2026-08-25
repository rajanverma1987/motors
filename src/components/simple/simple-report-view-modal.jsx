"use client";

import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiDownload, FiShare2 } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { SIMPLE_TOOLBAR_BTN } from "@/lib/simple-typography";
import {
  shouldShowReportShareButton,
} from "@/lib/mobile-native-share";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function formatCell(value, isAmount) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return isAmount
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(value);
  }
  return String(value);
}

/**
 * Modal preview of a Simple report table (same columns/rows as Excel export).
 * Supports server-side pagination + column sorting.
 * Share (PDF via native share sheet) shows only on iOS / Android.
 */
export default function SimpleReportViewModal({
  open,
  onClose,
  title = "Report",
  loading = false,
  error = "",
  sheetName = "",
  headers = [],
  rows = [],
  amountColumns = [],
  amountTotals = [],
  rowCount = 0,
  page = 1,
  pageSize = 50,
  totalPages = 1,
  sortBy = 0,
  sortDir = "desc",
  onPageChange,
  onSortChange,
  onDownload,
  downloading = false,
  onShare,
  sharing = false,
}) {
  const amountSet = useMemo(() => new Set(amountColumns || []), [amountColumns]);
  const [jumpPage, setJumpPage] = useState(String(page || 1));
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setJumpPage(String(page || 1));
  }, [page]);

  useEffect(() => {
    setShowShare(shouldShowReportShareButton() && typeof onShare === "function");
  }, [open, onShare]);

  const subtotals = useMemo(() => {
    if (Array.isArray(amountTotals) && amountTotals.length === (headers || []).length) {
      return amountTotals;
    }
    const totals = new Array((headers || []).length).fill(null);
    for (const colIdx of amountSet) {
      let sum = 0;
      for (const row of rows || []) {
        const n = Number(row?.[colIdx]);
        if (Number.isFinite(n)) sum += n;
      }
      totals[colIdx] = sum;
    }
    return totals;
  }, [amountSet, amountTotals, headers, rows]);

  const startItem = rowCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, rowCount);

  const headerActions = (
    <div className="flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
      {typeof onDownload === "function" ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={SIMPLE_TOOLBAR_BTN}
          disabled={loading || downloading || sharing}
          onClick={onDownload}
        >
          <FiDownload className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {downloading ? "…" : "Excel"}
        </Button>
      ) : null}
      {showShare ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={SIMPLE_TOOLBAR_BTN}
          disabled={loading || sharing || downloading || Boolean(error)}
          onClick={onShare}
          title="Share PDF"
        >
          <FiShare2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {sharing ? "…" : "Share"}
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="text-xs shrink-0" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="7xl"
      width="95vw"
      height="min(92vh, 900px)"
      closeOnOutsideClick={false}
      actions={headerActions}
      bodyClassName="!flex !flex-col !overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-secondary">
            {loading
              ? "Loading report…"
              : error
                ? error
                : `${sheetName || "Report"} · ${
                    rowCount === 0 ? "0 rows" : `${startItem}–${endItem} of ${rowCount} rows`
                  }`}
          </p>
          {showShare ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={SIMPLE_TOOLBAR_BTN}
              disabled={loading || sharing || downloading || Boolean(error)}
              onClick={onShare}
              title="Share PDF via apps on this device"
            >
              <FiShare2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {sharing ? "Preparing…" : "Share PDF"}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-secondary">Loading…</div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-danger">{error}</div>
        ) : !headers?.length ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-secondary">
            No columns in this report.
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr>
                    {headers.map((header, colIdx) => (
                      <th
                        key={`sub-${colIdx}`}
                        className={`sticky top-0 z-[3] whitespace-nowrap border-b border-border px-2 py-1.5 font-semibold text-title ${
                          amountSet.has(colIdx) ? "text-right tabular-nums" : ""
                        }`}
                        style={{ backgroundColor: "hsl(var(--bg))" }}
                      >
                        {colIdx === 0
                          ? "Subtotal (all rows)"
                          : amountSet.has(colIdx)
                            ? formatCell(subtotals[colIdx] ?? 0, true)
                            : ""}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {headers.map((header, colIdx) => {
                      const active = Number(sortBy) === colIdx;
                      return (
                        <th
                          key={`h-${colIdx}`}
                          className={`sticky top-[1.875rem] z-[3] whitespace-nowrap border-b border-border px-2 py-1.5 font-bold text-title ${
                            amountSet.has(colIdx) ? "text-right" : ""
                          }`}
                          style={{ backgroundColor: "hsl(var(--card))" }}
                        >
                          <button
                            type="button"
                            className={`inline-flex max-w-full items-center gap-1 hover:text-primary ${
                              amountSet.has(colIdx) ? "ml-auto" : ""
                            }`}
                            onClick={() => {
                              if (typeof onSortChange !== "function") return;
                              if (active) {
                                onSortChange(colIdx, sortDir === "asc" ? "desc" : "asc");
                              } else {
                                onSortChange(colIdx, "desc");
                              }
                            }}
                            title={`Sort by ${header}`}
                          >
                            <span className="truncate">{header}</span>
                            {active ? (
                              sortDir === "asc" ? (
                                <FiChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              ) : (
                                <FiChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              )
                            ) : null}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(rows || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(1, headers.length)}
                        className="px-3 py-10 text-center text-secondary"
                      >
                        No rows on this page.
                      </td>
                    </tr>
                  ) : (
                    (rows || []).map((row, rowIdx) => (
                      <tr
                        key={`r-${rowIdx}`}
                        className="odd:bg-bg even:bg-card hover:bg-primary/[0.04]"
                      >
                        {headers.map((_, colIdx) => (
                          <td
                            key={`c-${rowIdx}-${colIdx}`}
                            className={`whitespace-nowrap border-b border-border/70 px-2 py-1 text-title ${
                              amountSet.has(colIdx) ? "text-right tabular-nums" : ""
                            }`}
                          >
                            {formatCell(row?.[colIdx], amountSet.has(colIdx))}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs text-secondary">
                <span>Rows per page</span>
                <select
                  className="h-8 rounded-md border border-border bg-bg px-2 text-xs text-title"
                  value={String(pageSize)}
                  disabled={loading || typeof onPageChange !== "function"}
                  onChange={(e) => onPageChange?.(1, Number(e.target.value) || 50)}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={loading || page <= 1 || typeof onPageChange !== "function"}
                  onClick={() => onPageChange?.(page - 1, pageSize)}
                >
                  Previous
                </Button>
                <form
                  className="flex items-center gap-1 text-xs text-secondary"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const next = Math.max(1, Math.min(totalPages, Number(jumpPage) || 1));
                    onPageChange?.(next, pageSize);
                  }}
                >
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    className="h-8 w-14 rounded-md border border-border bg-bg px-1.5 text-center text-xs text-title"
                    disabled={loading}
                  />
                  <span>of {totalPages}</span>
                </form>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={loading || page >= totalPages || typeof onPageChange !== "function"}
                  onClick={() => onPageChange?.(page + 1, pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
