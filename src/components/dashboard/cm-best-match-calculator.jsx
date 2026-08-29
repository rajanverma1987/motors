"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { FiPlus, FiPrinter, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { useConfirm } from "@/components/confirm-provider";
import { calculateCMBestMatch } from "@/lib/cm-calculator";
import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  formatOriginalWireSelection,
  normalizeCirMillsUnit,
} from "@/lib/platform-cir-mills";
import { loadCirMillsSessionCatalogs, getCirMillsSessionCatalog, hasCirMillsSessionCatalogs } from "@/lib/cir-mills-session-cache";
import { useToast } from "@/components/toast-provider";
import { useFormatDateTime } from "@/contexts/user-settings-context";
import "./cm-best-match-print.css";

const MAX_SELECT = 10;
const MAX_WIRES_CAP = 200;
const RESULTS_PAGE_SIZE = 200;
const ORIGINAL_WIRES_FORM_ID = "cm-original-wires-form";

function num(v) {
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** VBA-style: unused slots show 0; otherwise catalog size label (e.g. 14, 18.5) */
function slotSize(row, i) {
  const q = row[`wires${i}`];
  if (!q || q <= 0) return 0;
  const s = row[`wireSize${i}`];
  return s != null && s !== "" ? s : 0;
}

function slotQty(row, i) {
  const q = row[`wires${i}`];
  return q > 0 ? q : 0;
}

/** Green = close match; yellow = within moderate band (matches desktop tool) */
function resultRowClass(percentDifference) {
  const a = Math.abs(Number(percentDifference) || 0);
  if (a <= 2) return "bg-emerald-500/15 dark:bg-emerald-500/20";
  if (a <= 5) return "bg-amber-400/25 dark:bg-amber-500/15";
  return "bg-card";
}

/** Print stylesheet row tint (see cm-best-match-print.css) */
function resultRowPrintClass(percentDifference) {
  const a = Math.abs(Number(percentDifference) || 0);
  if (a <= 2) return "cm-print-row-good";
  if (a <= 5) return "cm-print-row-mid";
  return "";
}

function VarCell({ label, value }) {
  return (
    <div>
      <span className="cm-var-label block text-xs font-medium text-secondary">{label}</span>
      <span className="cm-var-value tabular-nums text-sm font-semibold text-title">{value}</span>
    </div>
  );
}

function WireUnitToggle({ wireUnit, onUnitChange, disabled = false }) {
  return (
    <div
      className="inline-flex shrink-0 rounded-md border border-border bg-form-bg p-0.5"
      role="group"
      aria-label="Wire measurement unit"
    >
      <button
        type="button"
        onClick={() => onUnitChange(CIR_MILLS_UNIT_AWG)}
        disabled={disabled}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          wireUnit === CIR_MILLS_UNIT_AWG
            ? "bg-primary text-white"
            : "text-secondary hover:bg-card hover:text-title"
        }`}
        aria-pressed={wireUnit === CIR_MILLS_UNIT_AWG}
      >
        AWG
      </button>
      <button
        type="button"
        onClick={() => onUnitChange(CIR_MILLS_UNIT_METRIC)}
        disabled={disabled}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          wireUnit === CIR_MILLS_UNIT_METRIC
            ? "bg-primary text-white"
            : "text-secondary hover:bg-card hover:text-title"
        }`}
        aria-pressed={wireUnit === CIR_MILLS_UNIT_METRIC}
      >
        Metric
      </button>
    </div>
  );
}

/** Printable + on-screen results: variables + table (id required for print CSS) */
function CmBestMatchResultsBody({ results, resultContext, generatedLabel }) {
  const [page, setPage] = useState(1);

  const totalCount = results?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / RESULTS_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = totalCount === 0 ? 0 : (safePage - 1) * RESULTS_PAGE_SIZE + 1;
  const endItem = Math.min(safePage * RESULTS_PAGE_SIZE, totalCount);
  const pageRows = useMemo(() => {
    if (!results?.length) return [];
    const start = (safePage - 1) * RESULTS_PAGE_SIZE;
    return results.slice(start, start + RESULTS_PAGE_SIZE);
  }, [results, safePage]);

  useEffect(() => {
    setPage(1);
  }, [results]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  if (!resultContext || !results?.length) return null;

  return (
    <div id="cm-best-match-print-area" className="text-title">
      <h1 className="cm-print-title mb-1 text-lg font-bold text-title lg:text-xl">CM Best Match</h1>
      <p className="cm-print-meta mb-4 text-xs text-secondary">
        Generated {generatedLabel || "—"}
        {totalPages > 1 ? ` · Page ${safePage} of ${totalPages} (${startItem}–${endItem} of ${totalCount})` : ` · ${totalCount} match${totalCount === 1 ? "" : "es"}`}
        {" · "}
        Print uses landscape (use Print preview in your browser).
      </p>

      <div className="cm-print-vars mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/10 p-4 sm:grid-cols-3 dark:bg-muted/5">
        <VarCell label="Original Wires in Hand" value={resultContext.originalWiredInHand} />
        <VarCell label="Original Wire Size" value={resultContext.originalWireSize} />
        <VarCell label="Original CM" value={resultContext.originalCMDisplay} />
        <VarCell label="Targeted CM" value={resultContext.targetedCM} />
        <VarCell label="Desired Min Wires" value={resultContext.minWires} />
        <VarCell label="Desired Max Wires" value={resultContext.maxWires} />
        {resultContext.selectedCatalogSummary ? (
          <div className="cm-print-selected sm:col-span-2 lg:col-span-3">
            <span className="cm-var-label text-xs font-medium text-secondary">Catalog sizes used in search</span>
            <p className="cm-var-value mt-1 text-sm leading-snug text-title">{resultContext.selectedCatalogSummary}</p>
          </div>
        ) : null}
      </div>

      <p className="cm-print-hide mb-3 text-xs text-secondary">
        Rows in <span className="text-emerald-700 dark:text-emerald-400">green</span> are within ~2% of target;{" "}
        <span className="text-amber-800 dark:text-amber-400">yellow</span> within ~5%. Unused wire slots show 0.
      </p>

      {totalPages > 1 ? (
        <div className="cm-print-hide mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <span className="text-sm text-title">
            Showing {startItem}–{endItem} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Previous
            </Button>
            <span className="min-w-[5.5rem] text-center text-sm text-title">
              Page {safePage} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <div className="cm-results-table-wrap overflow-x-auto rounded-md border border-border">
        <table className="cm-results-table w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-primary text-white dark:bg-primary/90">
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">Wire Size</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold"># Wires</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">Wire Size 2</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold"># Wires 2</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">Wire Size 3</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold"># Wires 3</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">Total CM</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">Targeted CM</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">Wires In Hand</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">% Difference</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">CM Difference</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-left text-sm font-semibold">No of Wires</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr
                key={`${startItem + idx}-${row.totalCM}-${row.wiresInHand}-${row.percentDifference}`}
                className={`border-b border-border last:border-b-0 ${resultRowClass(row.percentDifference)} ${resultRowPrintClass(row.percentDifference)}`}
              >
                <td className="px-2 py-2 tabular-nums text-title">{slotSize(row, 1)}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">{slotQty(row, 1)}</td>
                <td className="px-2 py-2 tabular-nums text-title">{slotSize(row, 2)}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">{slotQty(row, 2)}</td>
                <td className="px-2 py-2 tabular-nums text-title">{slotSize(row, 3)}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">{slotQty(row, 3)}</td>
                <td className="px-2 py-2 tabular-nums font-medium text-title">{row.totalCM}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">{row.targetedCM}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">{row.wiresInHand}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">
                  {row.percentDifference > 0 ? "+" : ""}
                  {row.percentDifference}%
                </td>
                <td className="px-2 py-2 tabular-nums text-secondary">
                  {Number(row.cmDifference).toFixed(3)}
                </td>
                <td className="px-2 py-2 tabular-nums text-secondary">{row.noOfWires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="cm-print-hide mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <span className="text-sm text-title">
            Showing {startItem}–{endItem} of {totalCount} · {RESULTS_PAGE_SIZE} per page
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Previous
            </Button>
            <span className="min-w-[5.5rem] text-center text-sm text-title">
              Page {safePage} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Pick original winding sizes + qty from the shared Cir Mills catalog.
 * AWG/Metric toggle is local to this modal and independent of the wire catalog panel.
 */
function OriginalWiresSelectModal({
  open,
  onClose,
  customWireRows = [],
  catalogsByUnit = {},
  loading = false,
  initialQtys = {},
  onApply,
}) {
  const confirm = useConfirm();
  const [wireUnit, setWireUnit] = useState(CIR_MILLS_UNIT_AWG);
  const [qtyById, setQtyById] = useState({});

  const platformWireRows = useMemo(
    () =>
      (catalogsByUnit[wireUnit] || []).map((row) => ({
        ...row,
        id: row.id ? `platform:${row.id}` : "",
        source: "platform",
        wireUnit,
      })),
    [catalogsByUnit, wireUnit]
  );

  const catalog = useMemo(
    () => [...customWireRows, ...platformWireRows],
    [customWireRows, platformWireRows]
  );

  const allCatalogRows = useMemo(() => {
    const byId = new Map();
    for (const row of customWireRows) {
      if (row?.id) byId.set(row.id, row);
    }
    for (const unit of [CIR_MILLS_UNIT_AWG, CIR_MILLS_UNIT_METRIC]) {
      for (const row of catalogsByUnit[unit] || []) {
        if (!row?.id) continue;
        const id = `platform:${row.id}`;
        byId.set(id, { ...row, id, source: "platform", wireUnit: unit });
      }
    }
    return [...byId.values()];
  }, [customWireRows, catalogsByUnit]);

  const sizeColumnLabel = wireUnit === CIR_MILLS_UNIT_METRIC ? "Wire size (mm)" : "Wire size (AWG)";
  const qtyOnOtherLists = useMemo(() => {
    const visible = new Set(catalog.map((r) => r.id).filter(Boolean));
    let count = 0;
    for (const [id, raw] of Object.entries(qtyById || {})) {
      const qty = num(raw);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!visible.has(id)) count += 1;
    }
    return count;
  }, [catalog, qtyById]);

  const hasAnyQty = useMemo(() => {
    for (const raw of Object.values(qtyById || {})) {
      const qty = num(raw);
      if (Number.isFinite(qty) && qty > 0) return true;
    }
    return false;
  }, [qtyById]);

  useEffect(() => {
    if (!open) return;
    setQtyById({ ...(initialQtys || {}) });
  }, [open, initialQtys]);

  const setQty = (id, raw) => {
    const cleaned = String(raw ?? "").replace(/[^0-9.]/g, "");
    setQtyById((prev) => ({ ...prev, [id]: cleaned }));
  };

  const clearSelection = async () => {
    if (!hasAnyQty) return;
    const ok = await confirm({
      title: "Clear selection",
      message: "Clear all quantities on AWG and Metric lists?",
      confirmLabel: "Clear selection",
      variant: "danger",
    });
    if (!ok) return;
    setQtyById({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selections = [];
    for (const row of allCatalogRows) {
      const id = String(row.id || "");
      const qty = num(qtyById[id]);
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;
      selections.push({
        id,
        size: row.size,
        circularMills: Number(row.circularMills) || 0,
        qty,
      });
    }
    onApply?.(selections);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select original wires"
      size="lg"
      width="min(640px, 96vw)"
      height="min(80vh, 720px)"
      zIndex={80}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasAnyQty}
            onClick={clearSelection}
          >
            Clear selection
          </Button>
          <Button type="submit" form={ORIGINAL_WIRES_FORM_ID} variant="primary" size="sm">
            Apply selection
          </Button>
        </>
      }
    >
      <form id={ORIGINAL_WIRES_FORM_ID} onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm text-secondary">
            Enter quantity for each size in the winding. Switch AWG / Metric freely — quantities are kept on both
            lists. Total circular mils = Cir. Mills × qty for all selected sizes.
          </p>
          <WireUnitToggle wireUnit={wireUnit} onUnitChange={setWireUnit} disabled={loading} />
        </div>
        {qtyOnOtherLists > 0 ? (
          <p className="text-xs text-secondary">
            {qtyOnOtherLists} size{qtyOnOtherLists === 1 ? "" : "s"} with qty on the other list will also be applied.
          </p>
        ) : null}
        {loading ? (
          <div
            className="flex min-h-[160px] flex-col items-center justify-center gap-3"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <span
              className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
              aria-hidden
            />
            <p className="text-sm text-secondary">Loading wire catalog…</p>
          </div>
        ) : catalog.length === 0 ? (
          <p className="text-sm text-secondary">
            No wire sizes available for this unit. Add custom sizes on the catalog or ask an admin to seed Cir Mills.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-[1] border-b border-border bg-form-bg">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-bold text-title">{sizeColumnLabel}</th>
                  <th className="px-2 py-2 text-right text-xs font-bold text-title">Cir. Mills</th>
                  <th className="w-28 px-2 py-2 text-right text-xs font-bold text-title">Qty</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="px-2 py-1.5 tabular-nums font-semibold text-title">
                      {row.size}
                      {row.source === "shop" ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Custom
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-secondary">{row.circularMills}</td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={qtyById[row.id] ?? ""}
                        onChange={(e) => setQty(row.id, e.target.value)}
                        className="h-7 w-full rounded-none border border-border bg-primary/[0.04] px-1.5 text-right text-sm tabular-nums text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10"
                        aria-label={`Quantity for size ${row.size}`}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default function CmBestMatchCalculator() {
  const toast = useToast();
  const confirm = useConfirm();
  const formatDateTime = useFormatDateTime();
  const [selected, setSelected] = useState(() => new Set());
  const [originalWiredInHand, setOriginalWiredInHand] = useState("");
  const [originalWireSize, setOriginalWireSize] = useState("");
  const [originalCM, setOriginalCM] = useState("");
  const [targetedCM, setTargetedCM] = useState("");
  const [minWires, setMinWires] = useState("3");
  const [maxWires, setMaxWires] = useState("10");
  const [results, setResults] = useState([]);
  const [resultContext, setResultContext] = useState(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [catalogsByUnit, setCatalogsByUnit] = useState(() => ({
    [CIR_MILLS_UNIT_AWG]: getCirMillsSessionCatalog(CIR_MILLS_UNIT_AWG),
    [CIR_MILLS_UNIT_METRIC]: getCirMillsSessionCatalog(CIR_MILLS_UNIT_METRIC),
  }));
  const [cirMillsLoading, setCirMillsLoading] = useState(() => !hasCirMillsSessionCatalogs());
  const [originalWiresModalOpen, setOriginalWiresModalOpen] = useState(false);
  const [originalWireQtys, setOriginalWireQtys] = useState({});
  const [catalogWireUnit, setCatalogWireUnit] = useState(CIR_MILLS_UNIT_AWG);
  const [shopWireRows, setShopWireRows] = useState([]);
  const [shopWiresLoading, setShopWiresLoading] = useState(true);
  const [newSize, setNewSize] = useState("");
  const [newCm, setNewCm] = useState("");
  const [savingWire, setSavingWire] = useState(false);

  const loadShopWires = useCallback(async () => {
    setShopWiresLoading(true);
    try {
      const res = await fetch("/api/dashboard/wire-sizes", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load wire catalog");
      const list = Array.isArray(data) ? data : [];
      setShopWireRows(list);
      setSelected((prev) => {
        const next = new Set();
        for (const row of list) {
          if (row.id && prev.has(row.id)) next.add(row.id);
        }
        for (const id of prev) {
          if (next.has(id)) continue;
          if (String(id).startsWith("platform:")) next.add(id);
        }
        return next;
      });
    } catch (e) {
      toast.error(e.message || "Could not load your wire catalog");
      setShopWireRows([]);
    } finally {
      setShopWiresLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadShopWires();
    // Load shop catalog once on mount. Explicit reload after add/remove only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const alreadyCached = hasCirMillsSessionCatalogs();
    if (!alreadyCached) setCirMillsLoading(true);

    loadCirMillsSessionCatalogs()
      .then((catalogs) => {
        if (cancelled) return;
        setCatalogsByUnit({
          [CIR_MILLS_UNIT_AWG]: catalogs.awg || [],
          [CIR_MILLS_UNIT_METRIC]: catalogs.metric || [],
        });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e.message || "Could not load Cir Mills table");
        setCatalogsByUnit({
          [CIR_MILLS_UNIT_AWG]: [],
          [CIR_MILLS_UNIT_METRIC]: [],
        });
      })
      .finally(() => {
        if (!cancelled) setCirMillsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCatalogUnit = (next) => {
    const u = normalizeCirMillsUnit(next);
    if (u === catalogWireUnit) return;
    setCatalogWireUnit(u);
  };

  const wireSizeColumnLabel =
    catalogWireUnit === CIR_MILLS_UNIT_METRIC ? "Wire size (mm)" : "Wire size (AWG)";
  const unitToggleLabel = catalogWireUnit === CIR_MILLS_UNIT_METRIC ? "Metric" : "AWG";

  const platformWireRows = useMemo(
    () =>
      (catalogsByUnit[catalogWireUnit] || []).map((row) => ({
        ...row,
        id: row.id ? `platform:${row.id}` : "",
        source: "platform",
        wireUnit: catalogWireUnit,
      })),
    [catalogsByUnit, catalogWireUnit]
  );

  const customWireRows = useMemo(
    () =>
      shopWireRows.map((row) => ({
        ...row,
        source: "shop",
      })),
    [shopWireRows]
  );

  /** Visible rows for the active AWG/Metric catalog table (custom sizes always listed). */
  const wireRows = useMemo(() => [...customWireRows, ...platformWireRows], [customWireRows, platformWireRows]);

  /** All selectable rows across AWG + Metric + custom — used so selections survive unit switches. */
  const allSelectableWireRows = useMemo(() => {
    const byId = new Map();
    for (const row of customWireRows) {
      if (row?.id) byId.set(row.id, row);
    }
    for (const unit of [CIR_MILLS_UNIT_AWG, CIR_MILLS_UNIT_METRIC]) {
      for (const row of catalogsByUnit[unit] || []) {
        if (!row?.id) continue;
        const id = `platform:${row.id}`;
        byId.set(id, { ...row, id, source: "platform", wireUnit: unit });
      }
    }
    return [...byId.values()];
  }, [customWireRows, catalogsByUnit]);

  const catalogLoading = cirMillsLoading || shopWiresLoading;

  const addWire = async () => {
    const size = newSize.trim();
    const cm = num(newCm);
    if (!size) {
      toast.warning("Enter a wire size label (e.g. 19 or 18.5).");
      return;
    }
    if (!Number.isFinite(cm) || cm <= 0) {
      toast.warning("Enter a positive circular mils value.");
      return;
    }
    setSavingWire(true);
    try {
      const res = await fetch("/api/dashboard/wire-sizes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, circularMills: cm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setNewSize("");
      setNewCm("");
      await loadShopWires();
      const newId = data?.id ? String(data.id) : "";
      if (newId) {
        const alreadySelected = selected.has(newId);
        const atMax = !alreadySelected && selected.size >= MAX_SELECT;
        if (!atMax && !alreadySelected) {
          setSelected((prev) => {
            if (prev.has(newId) || prev.size >= MAX_SELECT) return prev;
            const next = new Set(prev);
            next.add(newId);
            return next;
          });
          toast.success("Wire size added and selected.");
        } else if (atMax) {
          toast.warning(
            `Wire added, but selection is full (max ${MAX_SELECT}). Uncheck another size to include it.`
          );
        } else {
          toast.success("Wire size added and selected.");
        }
      } else {
        toast.success("Wire size added to your catalog.");
      }
    } catch (e) {
      toast.error(e.message || "Could not add wire size");
    } finally {
      setSavingWire(false);
    }
  };

  const removeWire = async (id) => {
    const ok = await confirm({
      title: "Remove wire size",
      message: "Remove this custom wire size from your shop catalog?",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/wire-sizes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Remove failed");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadShopWires();
      toast.success("Wire size removed.");
    } catch (e) {
      toast.error(e.message || "Could not remove wire size");
    }
  };

  /** Scope print layout fixes to CM results only (see cm-best-match-print.css) */
  useEffect(() => {
    const onBeforePrint = () => {
      if (typeof document !== "undefined" && document.getElementById("cm-best-match-print-area")) {
        document.documentElement.classList.add("cm-best-match-printing");
      }
    };
    const onAfterPrint = () => {
      document.documentElement.classList.remove("cm-best-match-printing");
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  const selectedList = useMemo(() => {
    return allSelectableWireRows.filter((w) => w.id && selected.has(w.id));
  }, [allSelectableWireRows, selected]);

  const selectedOnCurrentList = useMemo(() => {
    let n = 0;
    for (const w of wireRows) {
      if (w.id && selected.has(w.id)) n += 1;
    }
    return n;
  }, [wireRows, selected]);

  const wiresForCalc = useMemo(() => {
    return selectedList
      .map((w) => {
        let size = String(w.size ?? "").trim();
        if (w.source === "platform") {
          size =
            w.wireUnit === CIR_MILLS_UNIT_METRIC ? `${size} mm` : `${size} AWG`;
        }
        return { size, cm: Number(w.circularMills) || 0 };
      })
      .filter((w) => w.cm > 0);
  }, [selectedList]);

  const toggleId = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_SELECT) {
          toast.warning(`Select at most ${MAX_SELECT} wire sizes.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const clearCatalogSelection = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: "Clear selection",
      message: "Clear all selected wire sizes from AWG and Metric lists?",
      confirmLabel: "Clear selection",
      variant: "danger",
    });
    if (!ok) return;
    setSelected(new Set());
  };

  const handlePrint = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.print();
    });
  }, []);

  const applyOriginalWireSelection = (selections) => {
    const { display, totalQty, totalCm } = formatOriginalWireSelection(selections);
    if (!display) {
      toast.warning("Enter a quantity greater than zero for at least one wire size.");
      return;
    }
    const nextQtys = {};
    for (const s of selections) {
      if (s.id) nextQtys[s.id] = String(s.qty);
    }
    setOriginalWireQtys(nextQtys);
    setOriginalWireSize(display);
    setOriginalWiredInHand(String(totalQty));
    setOriginalCM(String(totalCm));
    setTargetedCM(String(totalCm));
    setOriginalWiresModalOpen(false);
  };

  const runCalculate = () => {
    const t = num(targetedCM);
    const minW = Math.floor(num(minWires));
    const maxW = Math.floor(num(maxWires));

    if (!Number.isFinite(t) || t <= 0) {
      toast.warning("Enter a valid targeted CM (circular mils).");
      return;
    }
    if (!Number.isFinite(minW) || !Number.isFinite(maxW)) {
      toast.warning("Enter valid desired min and max wire counts.");
      return;
    }
    if (minW < 1 || maxW < minW) {
      toast.warning("Desired min wires must be ≥ 1 and desired max wires must be ≥ min.");
      return;
    }
    if (maxW > MAX_WIRES_CAP) {
      toast.warning(`Desired max wires is capped at ${MAX_WIRES_CAP} for performance.`);
      return;
    }
    if (selectedList.length === 0) {
      toast.warning("Select at least one wire size.");
      return;
    }
    if (wiresForCalc.length === 0) {
      toast.warning("Selected wires need valid circular mils.");
      return;
    }

    const ocm = num(originalCM);
    const ctx = {
      originalWiredInHand: originalWiredInHand.trim() || "—",
      originalWireSize: originalWireSize.trim() || "—",
      originalCMDisplay: Number.isFinite(ocm) && ocm > 0 ? String(ocm) : "—",
      targetedCM: String(t),
      minWires: String(minW),
      maxWires: String(maxW),
      selectedCatalogSummary: selectedList
        .map((w) => {
          const unitHint =
            w.source === "platform"
              ? w.wireUnit === CIR_MILLS_UNIT_METRIC
                ? " mm"
                : " AWG"
              : "";
          return `${w.size}${unitHint} (${w.circularMills} CM)`;
        })
        .join("; "),
    };
    setResultContext(ctx);

    const out = calculateCMBestMatch(wiresForCalc, t, minW, maxW);
    setResults(out);
    if (out.length === 0) {
      setResultsModalOpen(false);
      toast.info("No combinations within ±5% of target with the current limits.");
    } else {
      setResultsModalOpen(true);
    }
  };

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-6">
      <div className="grid min-h-0 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left: Wire catalog (shared Cir Mills) */}
        <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20">
          <div className="mb-3 flex w-full flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-title">Wire catalog</h2>
              <p className="text-xs text-secondary">
                Shared Cir Mills table ({unitToggleLabel}) plus your shop&apos;s custom sizes. Select from AWG and
                Metric — selections stay when you switch lists. Up to {MAX_SELECT} sizes for the search.
              </p>
            </div>
            <WireUnitToggle wireUnit={catalogWireUnit} onUnitChange={setCatalogUnit} disabled={cirMillsLoading} />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="ml-auto shrink-0"
              disabled={selected.size === 0}
              onClick={clearCatalogSelection}
            >
              Clear selection
            </Button>
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3 dark:bg-muted/10 sm:flex-row sm:flex-wrap sm:items-end">
            <Input
              label="New size"
              className="min-w-0 flex-1 sm:min-w-[100px]"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              placeholder="e.g. 19 or 18.5"
              disabled={savingWire}
            />
            <Input
              label="Circular mils"
              className="w-full sm:w-32"
              type="text"
              inputMode="decimal"
              value={newCm}
              onChange={(e) => setNewCm(e.target.value)}
              placeholder="12360"
              disabled={savingWire}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWire}
              disabled={savingWire}
              className="shrink-0"
            >
              {savingWire ? "Adding…" : "Add to catalog"}
            </Button>
          </div>

          {catalogLoading ? (
            <div
              className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-md border border-border bg-bg"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span
                className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
                aria-hidden
              />
              <p className="text-sm text-secondary">Loading wire catalog…</p>
            </div>
          ) : wireRows.length === 0 ? (
            <p className="text-sm text-secondary">
              Add custom wire sizes above or ask an admin to seed the Cir Mills table.
            </p>
          ) : (
            <div className="min-h-[220px] max-h-[min(420px,calc(100vh-340px))] flex-1 overflow-auto rounded-md border border-border bg-bg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] border-b border-border bg-card">
                  <tr>
                    <th className="w-10 px-2 py-2 text-left" aria-label="Select" />
                    <th className="px-3 py-2 text-left font-medium text-title">{wireSizeColumnLabel}</th>
                    <th className="px-3 py-2 text-right font-medium text-title">Cir. Mills</th>
                    <th className="w-12 px-2 py-2" aria-label="Remove custom size" />
                  </tr>
                </thead>
                <tbody>
                  {wireRows.map((w) => (
                    <tr key={w.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={w.id ? selected.has(w.id) : false}
                          onChange={() => w.id && toggleId(w.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                          aria-label={`Select ${w.size}`}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-title">
                        {w.size}
                        {w.source === "shop" ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Custom
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-secondary">{w.circularMills}</td>
                      <td className="px-2 py-2 text-right">
                        {w.source === "shop" && w.id ? (
                          <button
                            type="button"
                            onClick={() => removeWire(w.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-danger hover:bg-danger/10"
                            aria-label={`Remove ${w.size}`}
                          >
                            <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {wireRows.length > 0 ? (
            <p className="mt-2 text-xs text-secondary">
              {selected.size} selected total
              {selected.size !== selectedOnCurrentList
                ? ` (${selectedOnCurrentList} on this ${unitToggleLabel} list)`
                : ""}
              {" · "}
              max {MAX_SELECT} for calc
            </p>
          ) : null}
        </section>

        {/* Right: inputs */}
        <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-title">CM Best Match</h2>
          <p className="mb-4 text-xs text-secondary">
            Enter original winding data and search limits. Choose wire sizes in the catalog at left.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Original Wires in Hand"
              type="text"
              inputMode="numeric"
              value={originalWiredInHand}
              onChange={(e) => setOriginalWiredInHand(e.target.value)}
              placeholder="10"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-title">Original Wire Size</span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-border bg-primary text-white hover:opacity-90"
                  title="Select wire sizes and quantities"
                  aria-label="Select original wire sizes"
                  onClick={() => setOriginalWiresModalOpen(true)}
                >
                  <FiPlus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <input
                type="text"
                value={originalWireSize}
                onChange={(e) => setOriginalWireSize(e.target.value)}
                placeholder="e.g. 12.5 #8, 13.5 #6"
                className="w-full min-w-0 rounded-md border-[0.5px] border-border bg-bg px-3 py-2 text-text placeholder:text-sm placeholder:text-secondary focus:outline-none focus:ring-[0.5px] focus:ring-primary focus:border-primary/30"
                aria-label="Original Wire Size"
              />
            </div>
            <Input
              label="Original CM"
              type="text"
              inputMode="decimal"
              value={originalCM}
              onChange={(e) => setOriginalCM(e.target.value)}
              placeholder="12360"
            />
            <Input
              label="Targeted CM"
              type="text"
              inputMode="decimal"
              value={targetedCM}
              onChange={(e) => setTargetedCM(e.target.value)}
              placeholder="12360"
            />
            <Input
              label="Desired Min Wires"
              type="text"
              inputMode="numeric"
              value={minWires}
              onChange={(e) => setMinWires(e.target.value)}
            />
            <Input
              label="Desired Max Wires"
              type="text"
              inputMode="numeric"
              value={maxWires}
              onChange={(e) => setMaxWires(e.target.value)}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            {results.length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setResultsModalOpen(true)}>
                View results ({results.length})
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="sm" onClick={runCalculate}>
              Calculate Best Match
            </Button>
          </div>

          <div
            className="mb-4 rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed text-secondary dark:bg-muted/10"
            aria-label="Variable descriptions"
          >
            <p className="mb-2 font-semibold text-title">What each field means</p>
            <dl className="m-0 space-y-2.5">
              <div>
                <dt className="font-medium text-title">Original Wires in Hand</dt>
                <dd className="mt-0.5 text-secondary">
                  Total conductor count from your original winding (auto-filled when you pick sizes with +).
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Original Wire Size</dt>
                <dd className="mt-0.5 text-secondary">
                  Use <strong className="text-title">+</strong> to pick sizes and qty from the Cir Mills table. Shown as{" "}
                  <span className="tabular-nums text-title">12.5 #8, 13.5 #6</span> (size # quantity).
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Original CM / Targeted CM</dt>
                <dd className="mt-0.5 text-secondary">
                  Filled from Cir. Mills × qty for all selected original sizes. Targeted CM is the search goal (±5%).
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Desired Min Wires / Desired Max Wires</dt>
                <dd className="mt-0.5 text-secondary">
                  Allowed total conductor count in a combination (all wires in parallel, up to three different sizes).
                  Results stay between these limits.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <OriginalWiresSelectModal
        open={originalWiresModalOpen}
        onClose={() => setOriginalWiresModalOpen(false)}
        customWireRows={customWireRows}
        catalogsByUnit={catalogsByUnit}
        loading={catalogLoading}
        initialQtys={originalWireQtys}
        onApply={applyOriginalWireSelection}
      />

      {results.length > 0 && resultContext ? (
        <Modal
          open={resultsModalOpen}
          onClose={() => setResultsModalOpen(false)}
          hostId="cm-best-match-modal-host"
          width="min(1680px, 98vw)"
          zIndex={70}
          headerClassName="min-w-0"
          actions={
            <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
              Print
            </Button>
          }
        >
          <CmBestMatchResultsBody
            results={results}
            resultContext={resultContext}
            generatedLabel={formatDateTime(new Date())}
          />
        </Modal>
      ) : null}
    </div>
  );
}
