"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { FiEdit2, FiX, FiRotateCw, FiDownload, FiSearch } from "react-icons/fi";
import { FaGripLinesVertical } from "react-icons/fa6";
import Button from "./button";
import Checkbox from "./checkbox";
import Modal from "./modal";
import { useUserSettings } from "@/contexts/user-settings-context";
import { formatDateForCurrency } from "@/lib/format-date";
import { resolveTablePageSize } from "@/lib/user-settings";
import {
  SIMPLE_HUB_STICKY_COLUMN_COUNT,
  SIMPLE_HUB_STICKY_COLUMNS_MQ,
} from "@/lib/simple-screen-ui";

/** Column keys that hold calendar dates (not timestamps) when no custom render is set. */
const TABLE_DATE_COLUMN_KEYS = new Set([
  "date",
  "datecreated",
  "paidat",
  "paiddate",
  "paymentdate",
  "invoicedate",
  "duedate",
  "shipdate",
  "orderdate",
  "pocutdate",
  "estimatedcompletion",
]);

function isTableDateColumn(col) {
  if (typeof col.render === "function" || col.formatDate === false) return false;
  const key = String(col.key || "").trim().toLowerCase();
  if (TABLE_DATE_COLUMN_KEYS.has(key)) return true;
  const label = String(col.label || "").trim().toLowerCase();
  return (
    label === "date" ||
    label === "paid date" ||
    label === "payment date" ||
    label === "date created"
  );
}

function defaultTableCellContent(col, value, currencyCode) {
  if (isTableDateColumn(col)) return formatDateForCurrency(value, currencyCode || "USD");
  return value;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

const DEFAULT_SEARCH_DEBOUNCE_MS = 350;

function getRowId(row, index, rowKey) {
  if (rowKey == null) return index;
  if (typeof rowKey === "function") return rowKey(row, index);
  return row[rowKey] ?? index;
}

function getColStyle(col) {
  if (!col.width && !col.minWidth && !col.maxWidth) return undefined;
  const style = {};
  if (col.width != null) style.width = typeof col.width === "number" ? `${col.width}px` : col.width;
  if (col.minWidth != null) style.minWidth = typeof col.minWidth === "number" ? `${col.minWidth}px` : col.minWidth;
  if (col.maxWidth != null) style.maxWidth = typeof col.maxWidth === "number" ? `${col.maxWidth}px` : col.maxWidth;
  return Object.keys(style).length ? style : undefined;
}

const alignClass = { left: "text-left", center: "text-center", right: "text-right" };

/** Keys that end with "number" but are identifiers, not quantities. */
const NON_NUMERIC_NUMBER_KEY_RE =
  /(?:rfq|workorder|invoice|job|serial|phone|account|quote|motor|customer|employee|reference|ref|po|line|part)s?number$/i;

const NUMERIC_KEY_SEGMENT_RE =
  /(?:^|[_-])(amount|total|subtotal|balance|price|cost|taxamount|taxpercent|taxpaid|qty|quantity|count|rate|percent|margin|discount|fee|paid|due|credit|debit|labor|parts|grand|value|sum|unpaid|remaining|unitprice|lineamount|ordertotal|invoicetotal|totalamount|grandtotal|labortotal|partstotal|invoiceamount|poamount)(?:$|[_-])/i;

const NUMERIC_KEY_SUFFIX_RE =
  /(?:total|amount|price|cost|qty|balance|paid|due|tax|fee|rate|labor|parts|grand|count|value|sum)s?$/i;

const NON_NUMERIC_KEY_RE = /taxexempt|paidstatus|paidat|paiddate|createdat|updatedat|date$/i;

function isNumericColumnType(type) {
  const t = String(type || "").trim().toLowerCase();
  return t === "number" || t === "numeric" || t === "money" || t === "currency" || t === "decimal";
}

function isNumericColumnKey(key) {
  const k = String(key || "").trim();
  if (!k || k.startsWith("__") || k === "actions" || k === "_actions") return false;
  if (NON_NUMERIC_NUMBER_KEY_RE.test(k) || NON_NUMERIC_KEY_RE.test(k)) return false;
  const norm = k.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return NUMERIC_KEY_SEGMENT_RE.test(k) || NUMERIC_KEY_SUFFIX_RE.test(k) || NUMERIC_KEY_SUFFIX_RE.test(norm);
}

function isNumericColumnLabel(label) {
  const l = String(label || "").trim().toLowerCase();
  if (!l) return false;
  return /\b(amount|total|totals|subtotal|price|qty|quantity|tax|cost|balance|labor|paid|due|count|rate|fee|margin|discount|grand|parts|other cost|unit price|order total|invoice total|tax amount|balance due|unpaid|remaining|credit|debit|value|sum)\b/.test(
    l
  );
}

function isNumericRawValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value !== "string") return false;
  const s = value.trim();
  if (!s || s === "—" || s === "-") return false;
  return /^[$€£]?\s*-?[\d,]+\.?\d*%?$/.test(s) || /^-?\d+(\.\d+)?$/.test(s);
}

/** Resolve text alignment for a column (explicit align wins). */
function resolveColumnAlign(col, { value, isPlaceholder } = {}) {
  if (col.isSelect) return "center";
  if (col.isAction || col.key === "actions" || col.key === "_actions") return "left";
  if (col.align && alignClass[col.align]) return col.align;
  if (col.numeric === true || isNumericColumnType(col.type)) return "right";
  if (isNumericColumnKey(col.key) || isNumericColumnLabel(col.label)) return "right";
  if (isPlaceholder) return "center";
  if (value !== undefined && typeof col.render !== "function" && isNumericRawValue(value)) return "right";
  return "left";
}

function escapeCsvCell(str) {
  if (str == null) return "";
  const s = String(str);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function Table({
  columns = [],
  data = [],
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onBulkDelete,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  searchable = false,
  onSearch,
  searchPlaceholder = "Search...",
  searchDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  rowKey,
  selectable = false,
  selectedRowIds = [],
  onSelectionChange,
  onCellClick,
  loading = false,
  // Optional: sorting
  sortState,
  onSort,
  // Optional: column filters
  filterState = {},
  onFilter,
  // Optional: empty state
  emptyMessage = "No data",
  emptyState,
  // Optional: sticky header
  stickyHeader = false,
  stickyHeaderMaxHeight,
  // Optional: striped rows
  striped = false,
  // Optional: dense padding
  dense = false,
  /** Optional body/header text scale: "xs" | "sm" | "default" (dense=15px / normal=17px). */
  textSize = "default",
  // Optional: empty cell placeholder (global or column.emptyCell)
  emptyCell = "-",
  // Optional: footer row (array of values keyed by column key, or array of row objects for multiple footer rows)
  footer,
  // Optional: export CSV
  exportable = false,
  exportFilename = "export.csv",
  /** When true with exportable, show an icon button (e.g. Ledger / Taxes) instead of text "Export CSV". */
  exportIconOnly = false,
  exportButtonTitle = "Excel export (CSV)",
  // Optional: responsive (horizontal scroll wrapper)
  responsive = false,
  // Optional: column visibility settings (icon opens modal to hide/show columns)
  columnSettings = false,
  hiddenColumnKeys = [],
  onColumnVisibilityChange,
  // Optional: resizable columns (drag column border in header to resize)
  resizableColumns = false,
  // Optional: refresh callback (shows refresh icon to the right of search; call to refetch table data)
  onRefresh,
  /** Optional node rendered immediately before the search input in the table toolbar. */
  toolbarBeforeSearch = null,
  /** Optional node rendered immediately after the refresh control in the table toolbar. */
  toolbarAfterRefresh = null,
  /** Header label for the actions column (default "Actions"). Pass "" for a compact delete-only column. */
  actionsColumnLabel = "Actions",
  /** When true (default), table grows to fill parent flex area and body scrolls inside */
  fillHeight = true,
  /** Client-side slice when server pagination is not used (default: on). Set false to show all rows. */
  paginateClientSide = true,
  /**
   * Freeze the first N data columns while scrolling horizontally.
   * When true, uses SIMPLE_HUB_STICKY_COLUMN_COUNT (3). When a number, freezes that many.
   */
  stickyColumns = false,
  /** Media query for when sticky columns apply (default: tablet / ≤1400px). Pass "" to always freeze. */
  stickyColumnsMediaQuery = SIMPLE_HUB_STICKY_COLUMNS_MQ,
}) {
  const stickyColumnCount =
    stickyColumns === true
      ? SIMPLE_HUB_STICKY_COLUMN_COUNT
      : typeof stickyColumns === "number" && stickyColumns > 0
        ? Math.floor(stickyColumns)
        : 0;
  const hasPagination = pagination && typeof onPageChange === "function";
  const enableClientPagination = !hasPagination && paginateClientSide;
  const hasEdit = typeof onEdit === "function";
  const hasDelete = typeof onDelete === "function";
  const hasBulkDelete = typeof onBulkDelete === "function";
  const hasSearch = searchable && typeof onSearch === "function";
  const hasSelection = selectable && Array.isArray(selectedRowIds) && typeof onSelectionChange === "function";
  const hasActions = hasEdit || hasDelete;
  const hasCellClick = typeof onCellClick === "function";
  const hasSort = typeof onSort === "function" && sortState != null;
  const hasFilter = typeof onFilter === "function";
  const hasFooter = footer != null && (Array.isArray(footer) ? footer.length > 0 : true);
  const hasColumnWidths = columns.some((c) => c.width || c.minWidth || c.maxWidth);
  const hasColumnSettings = columnSettings && typeof onColumnVisibilityChange === "function";
  const hasRefresh = typeof onRefresh === "function";
  const hasToolbarBeforeSearch = toolbarBeforeSearch != null;
  const hasToolbarAfterRefresh = toolbarAfterRefresh != null;

  const [searchInput, setSearchInput] = useState("");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [draftHiddenKeys, setDraftHiddenKeys] = useState([]);
  const [columnWidthOverrides, setColumnWidthOverrides] = useState({});
  const [resizing, setResizing] = useState({ key: null, startX: 0, startWidth: 0 });
  const resizingRef = useRef(resizing);
  useEffect(() => {
    resizingRef.current = resizing;
  }, [resizing]);
  const debouncedSearchRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastEmittedSearchRef = useRef(null);
  const { settings: dashboardUserSettings } = useUserSettings();
  const preferredPageSize = resolveTablePageSize(dashboardUserSettings);
  const compactFromSettings = !!dashboardUserSettings?.compactTables;
  const isCompact = dense || compactFromSettings;
  const dateCurrency =
    typeof dashboardUserSettings?.currency === "string"
      ? dashboardUserSettings.currency.toUpperCase().trim() || "USD"
      : "USD";

  const cellPy = isCompact ? "py-1" : "py-1.5";
  /** Header stays roomier than body cells so column titles remain scannable. */
  const headerPy = isCompact ? "py-1.5" : "py-2";
  /** Default dense=xs / normal=sm; textSize "xs"|"sm" overrides. */
  const cellText =
    textSize === "xs" ? "text-xs" : textSize === "sm" ? "text-sm" : isCompact ? "text-xs" : "text-sm";
  const headerText =
    textSize === "xs"
      ? "text-xs font-semibold"
      : textSize === "sm"
        ? "text-sm font-semibold"
        : isCompact
          ? "text-xs font-semibold"
          : "text-sm font-semibold";
  const actionPad = isCompact ? "p-0.5" : "p-1";
  const actionIcon = isCompact ? "h-3.5 w-3.5" : "h-4 w-4";

  function cellPx(col) {
    if (col.isSelect || col.isAction) return "pl-[5px] pr-1";
    return isCompact ? "pl-[5px] pr-1" : "pl-[5px] pr-1.5";
  }

  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(() => resolveTablePageSize(preferredPageSize));
  const [cellHover, setCellHover] = useState({ row: null, col: null });

  const clearCellHover = () => setCellHover({ row: null, col: null });

  /** Row/column cross-highlight on hover (rowIndex null = header row). */
  const cellHoverClass = (rowIndex, colIndex) => {
    const { row, col } = cellHover;
    const hitRow = rowIndex != null && row === rowIndex;
    const hitCol = col === colIndex;
    if (hitRow && hitCol) return "bg-primary/10";
    if (hitCol) return "bg-muted/30";
    return "";
  };

  const cellBorderClass = "border-r border-border";

  useEffect(() => {
    if (!enableClientPagination) return;
    const n = resolveTablePageSize(preferredPageSize);
    if (n !== internalPageSize) {
      setInternalPageSize(n);
      setInternalPage(1);
    }
  }, [preferredPageSize, enableClientPagination]);

  function parseColWidth(col) {
    if (col.minWidth != null) return typeof col.minWidth === "number" ? col.minWidth : parseInt(String(col.minWidth), 10) || 80;
    if (col.width != null) return typeof col.width === "number" ? col.width : parseInt(String(col.width), 10) || 80;
    return 80;
  }
  function getEffectiveColStyle(col) {
    const override = columnWidthOverrides[col.key];
    if (override != null) return { width: `${override}px`, minWidth: `${override}px` };
    return getColStyle(col);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasSearch) return;
    debouncedSearchRef.current = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (lastEmittedSearchRef.current === trimmed) return;
      lastEmittedSearchRef.current = trimmed;
      if (isMountedRef.current) onSearch(trimmed);
    }, searchDebounceMs);
    return () => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current);
        debouncedSearchRef.current = null;
      }
    };
  }, [searchInput, hasSearch, searchDebounceMs, onSearch]);

  const page = hasPagination
    ? Math.max(1, Number(pagination.page) || 1)
    : enableClientPagination
      ? internalPage
      : 1;
  const pageSize = hasPagination
    ? Math.max(1, Number(pagination.pageSize) || data.length)
    : enableClientPagination
      ? internalPageSize
      : Math.max(1, data.length);
  const totalCount = hasPagination ? Number(pagination.totalCount) || data.length : data.length;
  const totalPages = Math.max(1, Math.ceil((totalCount || 1) / pageSize));
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const displayData =
    enableClientPagination && data.length > 0
      ? data.slice((page - 1) * pageSize, page * pageSize)
      : data;

  useEffect(() => {
    if (!enableClientPagination) return;
    const tp = Math.max(1, Math.ceil(data.length / internalPageSize) || 1);
    if (internalPage > tp) setInternalPage(tp);
  }, [data.length, internalPageSize, enableClientPagination, internalPage]);

  const handlePrev = (e) => {
    e?.preventDefault();
    if (page <= 1) return;
    if (hasPagination) onPageChange(page - 1, pageSize);
    else setInternalPage((p) => Math.max(1, p - 1));
  };

  const handleNext = (e) => {
    e?.preventDefault();
    if (page >= totalPages) return;
    if (hasPagination) onPageChange(page + 1, pageSize);
    else setInternalPage((p) => p + 1);
  };

  const handlePageSizeChange = (e) => {
    const newSize = Math.max(1, Number(e.target.value) || 10);
    if (hasPagination) onPageChange(1, newSize);
    else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  const showPaginationBar = hasPagination || enableClientPagination;
  const effectiveStickyHeader = stickyHeader || fillHeight;

  const selectedSet = new Set(selectedRowIds);
  const currentPageIds = displayData.map((row, i) => getRowId(row, i, rowKey));
  const allOnPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedSet.has(id));
  const someOnPageSelected = currentPageIds.some((id) => selectedSet.has(id));
  const selectAllRef = useRef(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
  }, [allOnPageSelected, someOnPageSelected]);

  const handleSelectAll = () => {
    if (allOnPageSelected) {
      const next = selectedRowIds.filter((id) => !currentPageIds.includes(id));
      onSelectionChange(next);
    } else {
      const merged = new Set([...selectedRowIds, ...currentPageIds]);
      onSelectionChange([...merged]);
    }
  };

  const handleSelectRow = (row, i) => {
    const id = getRowId(row, i, rowKey);
    if (selectedSet.has(id)) {
      onSelectionChange(selectedRowIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedRowIds, id]);
    }
  };

  const handleBulkDelete = () => {
    onBulkDelete([...selectedRowIds]);
    onSelectionChange([]);
  };

  const isCellPlaceholder = (col, row, i) => {
    const value = row[col.key];
    const placeholder = col.emptyCell ?? emptyCell;
    if (placeholder == null || placeholder === false) return false;
    const content =
      typeof col.render === "function" ? col.render(value, row, i) : defaultTableCellContent(col, value, dateCurrency);
    return content == null || content === "";
  };

  const handleResizeStart = (col, e) => {
    e.preventDefault();
    if (!resizableColumns || col.isSelect || col.isAction) return;
    const startWidth = columnWidthOverrides[col.key] ?? parseColWidth(col);
    setResizing({ key: col.key, startX: e.clientX, startWidth });
  };

  useEffect(() => {
    if (resizing.key == null) return;
    const handleMove = (e) => {
      const r = resizingRef.current;
      if (r.key == null) return;
      const delta = e.clientX - r.startX;
      const newWidth = Math.max(40, r.startWidth + delta);
      setColumnWidthOverrides((prev) => ({ ...prev, [r.key]: newWidth }));
      resizingRef.current = { ...r, startX: e.clientX, startWidth: newWidth };
    };
    const handleUp = () => setResizing({ key: null, startX: 0, startWidth: 0 });
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing.key]);

  const selectColumn = hasSelection
    ? [{ key: "__select", label: "", isSelect: true, width: 48 }]
    : [];
  const actionsColumn = hasActions
    ? [
        {
          key: "__actions",
          label: actionsColumnLabel ?? "Actions",
          isAction: true,
          ...(actionsColumnLabel === "" ? { width: 52, minWidth: 52, maxWidth: 56 } : {}),
        },
      ]
    : [];

  const visibleDataColumns = columns.filter((c) => !hiddenColumnKeys.includes(c.key));
  const displayColumns = [...selectColumn, ...visibleDataColumns, ...actionsColumn];

  const tableRef = useRef(null);
  const [stickyColumnsActive, setStickyColumnsActive] = useState(false);
  const [stickyLeftOffsets, setStickyLeftOffsets] = useState([]);

  useEffect(() => {
    if (stickyColumnCount <= 0) {
      setStickyColumnsActive(false);
      return undefined;
    }
    const mqRaw = String(stickyColumnsMediaQuery || "").trim();
    if (!mqRaw) {
      setStickyColumnsActive(true);
      return undefined;
    }
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setStickyColumnsActive(true);
      return undefined;
    }
    const mq = window.matchMedia(mqRaw);
    const sync = () => setStickyColumnsActive(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, [stickyColumnCount, stickyColumnsMediaQuery]);

  const measureStickyOffsets = useCallback(() => {
    const tableEl = tableRef.current;
    if (!tableEl || stickyColumnCount <= 0 || !stickyColumnsActive) {
      setStickyLeftOffsets([]);
      return;
    }
    const ths = tableEl.querySelectorAll("thead tr th");
    const n = Math.min(stickyColumnCount, ths.length, displayColumns.length);
    const next = [];
    let acc = 0;
    for (let i = 0; i < n; i += 1) {
      next.push(acc);
      acc += ths[i].getBoundingClientRect().width;
    }
    setStickyLeftOffsets((prev) => {
      if (prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 0.5)) {
        return prev;
      }
      return next;
    });
  }, [stickyColumnCount, stickyColumnsActive, displayColumns.length]);

  useLayoutEffect(() => {
    measureStickyOffsets();
  }, [measureStickyOffsets, displayData.length, columnWidthOverrides, isCompact, textSize]);

  useEffect(() => {
    if (!stickyColumnsActive || stickyColumnCount <= 0) return undefined;
    const tableEl = tableRef.current;
    if (!tableEl || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => measureStickyOffsets());
    ro.observe(tableEl);
    const scrollParent = tableEl.closest(".table-scroll-x");
    if (scrollParent) ro.observe(scrollParent);
    window.addEventListener("resize", measureStickyOffsets);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureStickyOffsets);
    };
  }, [stickyColumnsActive, stickyColumnCount, measureStickyOffsets]);

  const stickyColActiveCount =
    stickyColumnsActive && stickyColumnCount > 0 && stickyLeftOffsets.length > 0
      ? Math.min(stickyColumnCount, stickyLeftOffsets.length, displayColumns.length)
      : 0;

  const mergeStickyCellStyle = (colIndex, baseStyle, { isHeader = false } = {}) => {
    if (colIndex < 0 || colIndex >= stickyColActiveCount) return baseStyle;
    const left = stickyLeftOffsets[colIndex] ?? 0;
    const sticky = {
      position: "sticky",
      left,
      zIndex: isHeader ? (effectiveStickyHeader ? 30 : 20) : 5,
    };
    if (isHeader && effectiveStickyHeader) {
      sticky.top = 0;
      sticky.backgroundColor = "color-mix(in srgb, hsl(var(--primary)) 3%, hsl(var(--card)))";
      sticky.boxShadow = "inset 0 -1px 0 hsl(var(--border))";
    }
    return baseStyle ? { ...baseStyle, ...sticky } : sticky;
  };

  const stickyColClassName = (colIndex) => {
    if (colIndex < 0 || colIndex >= stickyColActiveCount) return "";
    const last = colIndex === stickyColActiveCount - 1 ? " ui-table-sticky-col-last" : "";
    return `ui-table-sticky-col${last}`;
  };

  const openSettingsModal = () => {
    setDraftHiddenKeys([...hiddenColumnKeys]);
    setSettingsModalOpen(true);
  };

  const saveColumnVisibility = () => {
    onColumnVisibilityChange(draftHiddenKeys);
    setSettingsModalOpen(false);
  };

  const toggleColumnDraft = (key, visible) => {
    setDraftHiddenKeys((prev) =>
      visible ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderCell = (col, row, i) => {
    if (col.isSelect) {
      const id = getRowId(row, i, rowKey);
      return (
        <input
          type="checkbox"
          checked={selectedSet.has(id)}
          onChange={() => handleSelectRow(row, i)}
          className="h-4 w-4 rounded border-border bg-card accent-primary"
          aria-label="Select row"
        />
      );
    }
    if (col.isAction) {
      return (
        <div className="flex cursor-pointer items-center gap-1">
          {hasEdit && (
            <button
              type="button"
              onClick={() => onEdit(row, i)}
              className={`cursor-pointer rounded ${actionPad} text-primary hover:bg-primary/10 outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary`}
              aria-label="Edit"
            >
              <FiEdit2 className={`${actionIcon} shrink-0`} aria-hidden />
            </button>
          )}
          {hasDelete && (
            <button
              type="button"
              onClick={() => onDelete(row, i)}
              className={`cursor-pointer rounded ${actionPad} text-danger hover:bg-danger/10 outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-danger`}
              aria-label="Delete"
            >
              <FiX className={`${actionIcon} shrink-0`} aria-hidden />
            </button>
          )}
        </div>
      );
    }
    const value = row[col.key];
    const placeholder = col.emptyCell ?? emptyCell;
    let content =
      typeof col.render === "function"
        ? col.render(value, row, i)
        : defaultTableCellContent(col, value, dateCurrency);
    if ((content == null || content === "") && placeholder != null && placeholder !== false) {
      content = placeholder;
    }

    const isClickable = col.clickable && hasCellClick;
    if (isClickable) {
      const cellAlign = resolveColumnAlign(col, { value, isPlaceholder: isCellPlaceholder(col, row, i) });
      content = (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCellClick(row, col.key, value, i);
          }}
          className={`w-full min-w-0 rounded px-0 py-0 border-0 bg-transparent text-primary cursor-pointer underline decoration-primary/50 hover:decoration-primary hover:opacity-90 outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${cellAlign === "right" ? "text-right" : "text-left"}`}
        >
          {content}
        </button>
      );
    }
    return content;
  };

  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const nextDir =
      sortState?.key === col.key && sortState?.direction === "asc"
        ? "desc"
        : "asc";
    onSort(col.key, nextDir);
  };

  const handleExportCsv = () => {
    const headers = columns.map((c) => c.label ?? c.key);
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (typeof c.exportValue === "function") return c.exportValue(val, row);
        if (isTableDateColumn(c)) return formatDateForCurrency(val, dateCurrency);
        return val;
      })
    );
    const csvContent = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((r) => r.map(escapeCsvCell).join(",")),
    ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tableClass = (hasColumnWidths || resizableColumns || responsive)
    ? "min-w-full w-max table-auto border-collapse"
    : "w-full border-collapse";
  const thClass = (col) => {
    const align = alignClass[resolveColumnAlign(col)] ?? "text-left";
    const wrap = col.headerWrap ? "whitespace-normal" : "whitespace-nowrap";
    const headerExtra = col.headerClassName ? ` ${col.headerClassName}` : "";
    return `${cellPx(col)} ${headerPy} ${headerText} font-semibold leading-snug text-title outline-none ${wrap} ${align} ${cellBorderClass}${headerExtra}`;
  };
  const thStickyStyle = effectiveStickyHeader
    ? {
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "color-mix(in srgb, hsl(var(--primary)) 3%, hsl(var(--card)))",
        boxShadow: "inset 0 -1px 0 hsl(var(--border))",
      }
    : undefined;

  const colgroup = (
    <colgroup>
      {displayColumns.map((col, i) => (
        <col key={col.key ?? i} style={getEffectiveColStyle(col)} />
      ))}
    </colgroup>
  );

  const tableContent = (
    <table ref={tableRef} className={tableClass} onMouseLeave={clearCellHover}>
      {colgroup}
      <thead className="border-b-2 border-border bg-primary/[0.03] outline-none dark:bg-primary/5">
        <tr>
          {displayColumns.map((col, i) => {
            const align = alignClass[resolveColumnAlign(col)] ?? "text-left";
            const style = getEffectiveColStyle(col);
            const isSortable = col.sortable && hasSort;
            const isFilterable = col.filterable && hasFilter && !col.isSelect && !col.isAction;
            const canResize = resizableColumns && !col.isSelect && !col.isAction;
            const stickyCls = stickyColClassName(i);
            const thStyle = mergeStickyCellStyle(
              i,
              effectiveStickyHeader ? { ...thStickyStyle, ...style } : style,
              { isHeader: true }
            );
            return (
              <th
                key={col.key ?? i}
                className={`${thClass(col)} ${cellHoverClass(null, i)} ${canResize ? "relative" : ""}${stickyCls ? ` ${stickyCls}` : ""} transition-colors`}
                style={thStyle}
                onMouseEnter={() => setCellHover({ row: null, col: i })}
              >
                {col.isSelect ? (
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    checked={allOnPageSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-border bg-card accent-primary"
                    aria-label="Select all on page"
                  />
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        {isSortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(col)}
                            className="flex items-center gap-1 rounded cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            {col.label}
                            <span className="text-secondary" aria-hidden>
                              {sortState?.key === col.key
                                ? sortState.direction === "asc"
                                  ? " ↑"
                                  : " ↓"
                                : " ⇅"}
                            </span>
                          </button>
                        ) : (
                          col.label
                        )}
                      </div>
                      {isFilterable && (
                        <input
                          type="text"
                          value={filterState[col.key] ?? ""}
                          onChange={(e) => onFilter(col.key, e.target.value)}
                          placeholder={`Filter ${col.label}`}
                          className="w-full min-w-0 rounded border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                          aria-label={`Filter by ${col.label}`}
                        />
                      )}
                    </div>
                  </>
                )}
                {canResize && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${col.label}`}
                    onMouseDown={(e) => handleResizeStart(col, e)}
                    className="absolute right-0 top-0 bottom-0 flex w-5 cursor-col-resize touch-none items-center justify-end pr-0.5 text-secondary hover:bg-primary/20 hover:text-primary"
                    style={{ marginRight: "-5px" }}
                  >
                    <FaGripLinesVertical className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {loading && data.length === 0 ? (
          <tr>
            <td
              colSpan={displayColumns.length}
              className={`px-4 ${isCompact ? "py-5" : "py-8"} text-center ${cellText} text-secondary`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <span
                  className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
                  aria-hidden
                />
                Loading…
              </span>
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td
              colSpan={displayColumns.length}
              className={`px-4 ${isCompact ? "py-5" : "py-8"} text-center ${cellText} text-secondary whitespace-nowrap`}
            >
              {emptyState != null ? emptyState : emptyMessage}
            </td>
          </tr>
        ) : (
          displayData.map((row, i) => (
            <tr
              key={getRowId(row, i, rowKey)}
              className={`border-b border-border last:border-b-0 transition-colors hover:bg-primary/[0.08] ${
                striped && i % 2 === 1 ? "bg-card/50" : ""
              }`}
              onMouseEnter={() => setCellHover((prev) => ({ row: i, col: prev.col }))}
              onMouseLeave={() => setCellHover((prev) => ({ row: null, col: prev.col }))}
            >
              {displayColumns.map((col, j) => {
                const isPlaceholder = isCellPlaceholder(col, row, i);
                const align =
                  alignClass[resolveColumnAlign(col, { value: row[col.key], isPlaceholder })] ?? "text-left";
                const widthStyle = getEffectiveColStyle(col);
                const rowCellStyle =
                  typeof col.getCellStyle === "function" ? col.getCellStyle(row[col.key], row, i) : null;
                const rowCellClass =
                  typeof col.getCellClassName === "function"
                    ? col.getCellClassName(row[col.key], row, i)
                    : "";
                const style =
                  rowCellStyle && typeof rowCellStyle === "object"
                    ? { ...widthStyle, ...rowCellStyle }
                    : widthStyle;
                const isActionLikeColumn =
                  col.isAction || col.key === "actions" || col.key === "_actions";
                /** Parent cursor does not override UA `button` cursor; target descendants explicitly. */
                const actionCellCursor = "[&_button]:cursor-pointer [&_a]:cursor-pointer";
                const hasRowCellColor = Boolean(rowCellStyle || rowCellClass);
                const stickyCls = stickyColClassName(j);
                const cellStyle = mergeStickyCellStyle(j, style);
                return (
                  <td
                    key={col.key ?? j}
                    className={`${cellPx(col)} ${cellPy} ${cellText} leading-snug ${hasRowCellColor ? "" : "text-text"} tabular whitespace-nowrap ${align} ${cellBorderClass} ${hasRowCellColor ? "" : cellHoverClass(i, j)} transition-colors${isActionLikeColumn ? ` cursor-pointer ${actionCellCursor}` : ""}${rowCellClass ? ` ${rowCellClass}` : ""}${stickyCls ? ` ${stickyCls}` : ""}`}
                    style={cellStyle}
                    onMouseEnter={() => setCellHover({ row: i, col: j })}
                  >
                    {renderCell(col, row, i)}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
      {hasFooter && !effectiveStickyHeader && (
        <tfoot className="border-t-2 border-border bg-card font-medium text-title">
          {(Array.isArray(footer) ? footer : [footer]).map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-b-0">
              {displayColumns.map((col, j) => {
                if (col.isSelect || col.isAction)
                  return (
                    <td
                      key={col.key ?? j}
                      className={`${cellPx(col)} ${cellPy} whitespace-nowrap ${cellBorderClass}`}
                    />
                  );
                const val = typeof row === "object" && row !== null ? row[col.key] : null;
                const isPlaceholder = val == null || val === "";
                const align =
                  alignClass[resolveColumnAlign(col, { value: val, isPlaceholder })] ?? "text-left";
                return (
                  <td
                    key={col.key ?? j}
                    className={`${cellPx(col)} ${cellPy} ${cellText} tabular whitespace-nowrap ${align} ${cellBorderClass}`}
                    style={getEffectiveColStyle(col)}
                  >
                    {val ?? emptyCell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  );

  const footerTable =
    effectiveStickyHeader && hasFooter ? (
      <table className={`${tableClass} w-full table-fixed`} style={{ tableLayout: "fixed" }} onMouseLeave={clearCellHover}>
        {colgroup}
        <tbody>
          {(Array.isArray(footer) ? footer : [footer]).map((row, ri) => (
            <tr key={ri} className="border-t-2 border-border bg-card font-medium text-title">
              {displayColumns.map((col, j) => {
                if (col.isSelect || col.isAction)
                  return (
                    <td
                      key={col.key ?? j}
                      className={`${cellPx(col)} ${cellPy} whitespace-nowrap ${cellBorderClass}`}
                    />
                  );
                const val = typeof row === "object" && row !== null ? row[col.key] : null;
                const isPlaceholder = val == null || val === "";
                const align =
                  alignClass[resolveColumnAlign(col, { value: val, isPlaceholder })] ?? "text-left";
                return (
                  <td
                    key={col.key ?? j}
                    className={`${cellPx(col)} ${cellPy} ${cellText} tabular whitespace-nowrap ${align} ${cellBorderClass}`}
                    style={getEffectiveColStyle(col)}
                  >
                    {val ?? emptyCell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    ) : null;

  const scrollMaxStyle =
    effectiveStickyHeader && !fillHeight
      ? { maxHeight: stickyHeaderMaxHeight ?? "70vh" }
      : undefined;
  const scrollAreaClass = fillHeight
    ? "table-scroll-x min-h-0 flex-1 overflow-auto"
    : "table-scroll-x min-h-0 overflow-auto";

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col gap-4" : "space-y-4"}>
      {(hasSearch ||
        hasRefresh ||
        hasToolbarBeforeSearch ||
        hasToolbarAfterRefresh ||
        loading ||
        (exportable && data.length > 0) ||
        hasColumnSettings) && (
        <div className={`flex min-w-0 flex-nowrap items-center gap-2 ${fillHeight ? "shrink-0" : ""}`}>
          {hasToolbarBeforeSearch ? <div className="shrink-0">{toolbarBeforeSearch}</div> : null}
          {hasSearch && (
            <div className="relative min-w-0 max-w-xs flex-1">
              <FiSearch
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 rounded-md border-[0.5px] border-border bg-bg py-2 pl-8 pr-3 text-sm text-text placeholder:text-secondary focus:outline-none focus:ring-[0.5px] focus:ring-primary focus:border-primary/30"
                aria-label="Search table"
              />
            </div>
          )}
          {hasRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-card text-secondary hover:bg-bg hover:text-text outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh table"
              title="Refresh"
            >
              <FiRotateCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            </button>
          )}
          {hasToolbarAfterRefresh ? <div className="shrink-0">{toolbarAfterRefresh}</div> : null}
          {loading && !hasRefresh && (
            <span
              className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
              aria-label="Loading"
            />
          )}
          {exportable && data.length > 0 &&
            (exportIconOnly ? (
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-card text-secondary hover:bg-bg hover:text-primary outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={exportButtonTitle}
                title={exportButtonTitle}
              >
                <FiDownload className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleExportCsv} className="shrink-0">
                Export CSV
              </Button>
            ))}
          {hasColumnSettings && (
            <button
              type="button"
              onClick={openSettingsModal}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-card text-secondary hover:bg-bg hover:text-text outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Table column settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {hasColumnSettings && (
        <Modal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          title="Column visibility"
          size="sm"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">Show or hide columns in the table.</p>
            <div className="flex flex-col gap-2">
              {columns.map((col) => (
                <Checkbox
                  key={col.key}
                  label={col.label ?? col.key}
                  name={`col-${col.key}`}
                  checked={!draftHiddenKeys.includes(col.key)}
                  onChange={(e) => toggleColumnDraft(col.key, e.target.checked)}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="primary" onClick={saveColumnVisibility}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {hasSelection && selectedRowIds.length > 0 && hasBulkDelete && (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 ${fillHeight ? "shrink-0" : ""}`}>
          <span className="text-sm text-title">
            {selectedRowIds.length} selected
          </span>
          <Button size="sm" variant="danger" onClick={handleBulkDelete}>
            Delete selected
          </Button>
        </div>
      )}

      <div
        className={
          fillHeight
            ? "ui-table-shell flex min-h-0 flex-1 flex-col overflow-hidden border border-border"
            : "ui-table-shell overflow-hidden border border-border"
        }
      >
        {effectiveStickyHeader ? (
          hasFooter ? (
            <div className={scrollAreaClass} style={scrollMaxStyle}>
              <div className="min-w-full w-max">
                {tableContent}
                {footerTable}
              </div>
            </div>
          ) : (
            <div className={scrollAreaClass} style={scrollMaxStyle}>
              {tableContent}
            </div>
          )
        ) : responsive ? (
          <div className={`table-scroll-x overflow-x-auto ${fillHeight ? "min-h-0 flex-1" : ""}`}>
            {tableContent}
          </div>
        ) : (
          <div className={fillHeight ? "min-h-0 flex-1 overflow-auto" : ""}>{tableContent}</div>
        )}
      </div>

      {showPaginationBar && (
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 ${isCompact ? "py-2" : "py-3"} ${fillHeight ? "shrink-0" : ""}`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-title">
              Showing {startItem}–{endItem} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-title">Per page</span>
              <select
                value={String(pageSize)}
                onChange={handlePageSizeChange}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-primary"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrev}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-title min-w-[4rem] text-center">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleNext}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
