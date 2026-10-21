"use client";

import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch } from "react-icons/fi";
import Button from "@/components/ui/button";

/**
 * Phone-only record list: search, optional toolbar, cards, server-side pagination.
 * Pair with a `hidden md:flex` Table sibling for tablet/desktop.
 */
export default function SimplePhoneRecordList({
  rows = [],
  loading = false,
  emptyMessage = "No records.",
  searchPlaceholder = "Search…",
  searchQuery = "",
  onSearch,
  toolbar = null,
  toolbarAfterSearch = null,
  pagination = null,
  onPageChange,
  onRefresh,
  rowKey = "id",
  renderCard,
  className = "",
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  const searchable = typeof onSearch === "function";

  useEffect(() => {
    if (!searchable) return undefined;
    const t = window.setTimeout(() => {
      if (localSearch === (searchQuery || "")) return;
      onSearch(localSearch);
    }, 250);
    return () => window.clearTimeout(t);
  }, [localSearch, onSearch, searchQuery, searchable]);

  const page = Number(pagination?.page) || 1;
  const pageSize = Number(pagination?.pageSize) || 25;
  const totalCount = Number(pagination?.totalCount) || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)) || 1);
  const showPager = Boolean(pagination && onPageChange && totalCount > 0);
  const showToolbarRow = Boolean(toolbar || searchable || onRefresh || toolbarAfterSearch);

  const getKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    const k = row?.[rowKey];
    return k != null && k !== "" ? String(k) : `row-${index}`;
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-2 md:hidden ${className}`}>
      {showToolbarRow ? (
        <div className="flex shrink-0 flex-col gap-2">
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
          {searchable || onRefresh ? (
            <div className="flex items-center gap-2">
              {searchable ? (
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search</span>
                  <FiSearch
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full rounded-none border border-border bg-card py-1.5 pl-8 pr-2 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
              {onRefresh ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 !rounded-none px-2"
                  onClick={onRefresh}
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <FiRefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                </Button>
              ) : null}
            </div>
          ) : null}
          {toolbarAfterSearch ? (
            <div className="flex flex-wrap items-center gap-2">{toolbarAfterSearch}</div>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {loading && rows.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-secondary">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-secondary">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col gap-2 pb-2">
            {rows.map((row, index) => (
              <li key={getKey(row, index)}>{renderCard(row, index)}</li>
            ))}
          </ul>
        )}
      </div>

      {showPager ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-2">
          <p className="text-xs text-secondary">
            Page {page} of {totalPages}
            {totalCount ? ` · ${totalCount}` : ""}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 !rounded-none px-2"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1, pageSize)}
              aria-label="Previous page"
            >
              <FiChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 !rounded-none px-2"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1, pageSize)}
              aria-label="Next page"
            >
              <FiChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
