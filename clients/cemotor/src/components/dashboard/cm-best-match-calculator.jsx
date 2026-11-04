"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { FiPlus, FiPrinter, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { useConfirm } from "@/components/confirm-provider";
import { calculateCMBestMatch } from "@/lib/cm-calculator";
import { formatCmJobResultSummary, normalizeCmJobCalculation } from "@/lib/cm-job-calculation";
import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  formatOriginalWireSelection,
  normalizeCirMillsUnit,
} from "@/lib/platform-cir-mills";
import { loadCirMillsSessionCatalogs, getCirMillsSessionCatalog, hasCirMillsSessionCatalogs } from "@/lib/cir-mills-session-cache";
import { useToast } from "@/components/toast-provider";
import { useFormatDateTime } from "@/contexts/user-settings-context";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
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
    <div className="flex items-baseline gap-4 rounded-md border border-border px-3 py-1.5">
      <span className="cm-var-label shrink-0 text-sm text-secondary">{label}</span>
      <span className="cm-var-value text-left text-sm font-bold text-title">{value}</span>
    </div>
  );
}

function splitInventoryPrintRows(rows) {
  const tableCount = rows.length > 46 ? 3 : 2;
  const size = Math.ceil(rows.length / tableCount);
  const chunks = [];
  for (let i = 0; i < tableCount; i += 1) {
    const chunk = rows.slice(i * size, (i + 1) * size);
    if (chunk.length) chunks.push(chunk);
  }
  return chunks;
}

function WireInventoryPrintSheet({ rows, unitLabel, generatedLabel }) {
  const chunks = splitInventoryPrintRows(rows);
  const perTable = chunks.reduce((max, chunk) => Math.max(max, chunk.length), 0);
  const tight = perTable > 32;
  const fontSize = tight ? "7.5pt" : "8.5pt";
  const cellPad = tight ? "1pt 4pt" : "2pt 4pt";
  const thStyle = {
    border: "1px solid #222",
    padding: cellPad,
    textAlign: "left",
    background: "#f3f0ea",
    fontWeight: 600,
    fontSize,
  };
  const tdStyle = {
    border: "1px solid #222",
    padding: cellPad,
    textAlign: "left",
    fontSize,
    lineHeight: 1.15,
  };
  const unitTitle = unitLabel === "Metric" ? "Metric table" : "AWG table";
  const hasCustom = rows.some((row) => row.custom);

  return (
    <div className="wire-inventory-print" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <h1 style={{ margin: "0", fontSize: "14pt", fontWeight: 700, lineHeight: 1.2 }}>Wire From Inventory</h1>
      <p style={{ margin: "2pt 0 8pt", fontSize: "12pt", fontWeight: 700 }}>
        {unitTitle}
        {generatedLabel ? <span style={{ fontWeight: 500, fontSize: "8pt", color: "#444" }}>{` · ${generatedLabel}`}</span> : null}
      </p>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "8pt 0" }}>
        <tbody>
          <tr>
            {chunks.map((chunk, index) => (
              <td key={index} style={{ width: `${100 / chunks.length}%`, verticalAlign: "top", padding: 0, border: "none" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Size</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Cir. Mills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((row) => (
                      <tr key={row.id || `${row.size}-${row.circularMills}`}>
                        <td style={{ ...tdStyle, fontWeight: row.selected ? 700 : 400 }}>
                          {row.size}
                          {row.custom ? "*" : ""}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: row.selected ? 700 : 400 }}>{row.circularMills}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {hasCustom ? <p style={{ margin: "6pt 0 0", fontSize: "8pt", color: "#444" }}>* Custom size</p> : null}
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
function CmBestMatchResultsBody({
  results,
  resultContext,
  generatedLabel,
  areaId = "cm-best-match-print-area",
}) {
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

  const hasRows = totalCount > 0;

  return (
    <div id={areaId} className="text-title">
      <h1 className="cm-print-title mb-1 text-lg font-bold text-title lg:text-xl">CM Best Match</h1>
      {hasRows ? (
        <p className="cm-print-meta mb-4 text-xs text-secondary">
          Generated {generatedLabel || "—"}
          {totalPages > 1 ? ` · Page ${safePage} of ${totalPages} (${startItem}–${endItem} of ${totalCount})` : ` · ${totalCount} match${totalCount === 1 ? "" : "es"}`}
          {" · "}
          Print uses landscape (use Print preview in your browser).
        </p>
      ) : (
        <p className="cm-print-hide mb-4 text-xs text-secondary">
          {resultContext
            ? "No combinations within 5% of the targeted CM."
            : "Matches appear in this table after you click Calculate Best Match."}
        </p>
      )}

      {resultContext ? (
        <div className="cm-print-vars mb-4 grid w-max max-w-full grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
          <div className="flex min-w-[18rem] flex-col gap-1.5">
            <VarCell label="Original Wires in Hand" value={resultContext.originalWiredInHand} />
            <VarCell label="Original Wire Size" value={resultContext.originalWireSize} />
            <VarCell label="Original CM" value={resultContext.originalCMDisplay} />
          </div>
          <div className="flex min-w-[22rem] max-w-xl flex-col gap-1.5">
            <VarCell label="Desired Min Wires" value={resultContext.minWires} />
            <VarCell label="Desired Max Wires" value={resultContext.maxWires} />
            <VarCell label="Targeted CM" value={resultContext.targetedCM} />
            {resultContext.selectedCatalogSummary ? (
              <VarCell label="Chosen from Inventory" value={resultContext.selectedCatalogSummary} />
            ) : null}
          </div>
        </div>
      ) : null}

      {hasRows ? (
      <p className="cm-print-hide mb-3 text-xs text-secondary">
        Rows in <span className="text-emerald-700 dark:text-emerald-400">green</span> are within ~2% of target;{" "}
        <span className="text-amber-800 dark:text-amber-400">yellow</span> within ~5%. Unused wire slots show 0.
      </p>
      ) : null}

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
            {!hasRows ? (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-sm text-secondary">
                  {resultContext ? "No combinations within 5% of the targeted CM." : "No matches yet."}
                </td>
              </tr>
            ) : null}
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
  const unitLabel = wireUnit === CIR_MILLS_UNIT_METRIC ? "Metric" : "AWG";
  const qtyOnOtherLists = useMemo(() => {
    const visibleIds = new Set(catalog.map((r) => r.id).filter(Boolean));
    let count = 0;
    for (const [id, raw] of Object.entries(qtyById || {})) {
      const qty = num(raw);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!visibleIds.has(id)) count += 1;
    }
    return count;
  }, [catalog, qtyById]);

  const hasQtyOnCurrentList = useMemo(() => {
    for (const row of catalog) {
      const qty = num(qtyById[row.id]);
      if (Number.isFinite(qty) && qty > 0) return true;
    }
    return false;
  }, [catalog, qtyById]);

  useEffect(() => {
    if (!open) return;
    setQtyById({ ...(initialQtys || {}) });
  }, [open, initialQtys]);

  const setQty = (id, raw) => {
    const cleaned = String(raw ?? "").replace(/[^0-9.]/g, "");
    setQtyById((prev) => ({ ...prev, [id]: cleaned }));
  };

  const clearCurrentUnitSelection = async () => {
    if (!hasQtyOnCurrentList) return;
    const ok = await confirm({
      title: `Clear ${unitLabel} selection`,
      message: `Clear quantities on this ${unitLabel} list (including custom sizes shown here)? Quantities on the other unit stay.`,
      confirmLabel: `Clear ${unitLabel}`,
      variant: "danger",
    });
    if (!ok) return;
    setQtyById((prev) => {
      const next = { ...prev };
      for (const row of catalog) {
        if (row.id) delete next[row.id];
      }
      return next;
    });
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
            disabled={!hasQtyOnCurrentList}
            onClick={clearCurrentUnitSelection}
          >
            Clear {unitLabel}
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
            Enter quantity for each size. AWG and Metric quantities are kept separately — Clear only affects the list
            you are viewing. Total circular mils = Cir. Mills × qty for all sizes with qty.
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

export default function CmBestMatchCalculator({
  initialCalculation = null,
  onSaveToJob,
  savingToJob = false,
  jobNumber = "",
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const formatDateTime = useFormatDateTime();
  const seeded = normalizeCmJobCalculation(initialCalculation);
  const [selected, setSelected] = useState(() => new Set(seeded?.selectedWireIds || []));
  const [originalWiredInHand, setOriginalWiredInHand] = useState(seeded?.originalWiredInHand || "");
  const [originalWireSize, setOriginalWireSize] = useState(seeded?.originalWireSize || "");
  const [originalCM, setOriginalCM] = useState(seeded?.originalCM || "");
  const [targetedCM, setTargetedCM] = useState(seeded?.targetedCM || "");
  const [minWires, setMinWires] = useState(seeded?.minWires || "3");
  const [maxWires, setMaxWires] = useState(seeded?.maxWires || "10");
  const [originalWireQtys, setOriginalWireQtys] = useState(seeded?.originalWireQtys || {});
  const [catalogWireUnit, setCatalogWireUnit] = useState(seeded?.catalogWireUnit || CIR_MILLS_UNIT_AWG);
  const [results, setResults] = useState(() => (Array.isArray(seeded?.results) ? seeded.results : []));
  const [resultContext, setResultContext] = useState(seeded?.resultContext || null);
  const [savedSnapshot, setSavedSnapshot] = useState(seeded);
  const [outputSaved, setOutputSaved] = useState(() => Array.isArray(seeded?.results) && seeded.results.length > 0);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [resultsPrint, setResultsPrint] = useState(false);
  const [resultsScrollToken, setResultsScrollToken] = useState(0);
  const resultsRef = useRef(null);
  const printingResultsRef = useRef(false);
  const [catalogsByUnit, setCatalogsByUnit] = useState(() => ({
    [CIR_MILLS_UNIT_AWG]: getCirMillsSessionCatalog(CIR_MILLS_UNIT_AWG),
    [CIR_MILLS_UNIT_METRIC]: getCirMillsSessionCatalog(CIR_MILLS_UNIT_METRIC),
  }));
  const [cirMillsLoading, setCirMillsLoading] = useState(() => !hasCirMillsSessionCatalogs());
  const [originalWiresModalOpen, setOriginalWiresModalOpen] = useState(false);
  const [inventoryPrint, setInventoryPrint] = useState(null);
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
      if (printingResultsRef.current && document.getElementById("cm-best-match-print-area")) {
        document.documentElement.classList.add("cm-best-match-printing");
      }
    };
    const onAfterPrint = () => {
      printingResultsRef.current = false;
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

  const inventoryWireDisplay = useMemo(() => {
    return selectedList
      .map((w) => {
        const unitHint =
          w.source === "platform"
            ? w.wireUnit === CIR_MILLS_UNIT_METRIC
              ? " mm"
              : " AWG"
            : "";
        return `${w.size}${unitHint}`;
      })
      .join(", ");
  }, [selectedList]);

  const selectedOnCurrentList = useMemo(() => {
    let n = 0;
    for (const w of wireRows) {
      if (w.id && selected.has(w.id)) n += 1;
    }
    return n;
  }, [wireRows, selected]);

  const selectedPlatformOnCurrentUnit = useMemo(() => {
    let n = 0;
    for (const w of platformWireRows) {
      if (w.id && selected.has(w.id)) n += 1;
    }
    return n;
  }, [platformWireRows, selected]);

  const selectedCustom = useMemo(() => {
    let n = 0;
    for (const w of customWireRows) {
      if (w.id && selected.has(w.id)) n += 1;
    }
    return n;
  }, [customWireRows, selected]);

  const clearableOnCurrentList = selectedPlatformOnCurrentUnit + selectedCustom;

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

  const clearCatalogCurrentUnit = async () => {
    if (clearableOnCurrentList === 0) return;
    const ok = await confirm({
      title: `Clear ${unitToggleLabel} selection`,
      message: `Clear selected ${unitToggleLabel} sizes and custom sizes on this list? Selections on the other unit stay.`,
      confirmLabel: `Clear ${unitToggleLabel}`,
      variant: "danger",
    });
    if (!ok) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const w of platformWireRows) {
        if (w.id) next.delete(w.id);
      }
      for (const w of customWireRows) {
        if (w.id) next.delete(w.id);
      }
      return next;
    });
  };

  const clearBestMatchFields = async () => {
    const hasFields =
      Boolean(String(originalWiredInHand || "").trim()) ||
      Boolean(String(originalWireSize || "").trim()) ||
      Boolean(String(originalCM || "").trim()) ||
      Boolean(String(targetedCM || "").trim()) ||
      Object.keys(originalWireQtys || {}).length > 0 ||
      results.length > 0 ||
      String(minWires) !== "3" ||
      String(maxWires) !== "10";
    if (!hasFields) return;
    const ok = await confirm({
      title: "Clear fields",
      message: "Clear all CM Best Match fields and results so you can start a new calculation?",
      confirmLabel: "Clear fields",
      variant: "danger",
    });
    if (!ok) return;
    setOriginalWiredInHand("");
    setOriginalWireSize("");
    setOriginalCM("");
    setTargetedCM("");
    setMinWires("3");
    setMaxWires("10");
    setOriginalWireQtys({});
    setResults([]);
    setResultContext(null);
    setOutputSaved(false);
  };

  const handlePrint = useCallback(() => {
    if (!results.length) {
      toast.warning("Calculate first, then print the matches.");
      return;
    }
    printingResultsRef.current = true;
    setResultsPrint(true);
  }, [results.length, toast]);

  const printInventoryTable = () => {
    if (wireRows.length === 0) {
      toast.warning("There are no wire sizes to print.");
      return;
    }
    setInventoryPrint({
      rows: wireRows.map((w) => ({
        id: w.id,
        size: w.size,
        circularMills: w.circularMills,
        custom: w.source === "shop",
        selected: Boolean(w.id && selected.has(w.id)),
      })),
      unitLabel: unitToggleLabel,
      generatedLabel: formatDateTime(new Date()),
    });
  };

  const applyOriginalWireSelection = (selections) => {
    const { display, totalQty, totalCm } = formatOriginalWireSelection(selections);
    if (!display) {
      setOriginalWireQtys({});
      setOriginalWireSize("");
      setOriginalWiredInHand("");
      setOriginalCM("");
      setTargetedCM("");
      setOriginalWiresModalOpen(false);
      toast.success("Original wire fields cleared.");
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
    setOutputSaved(false);
    if (out.length === 0) {
      toast.info("No combinations within ±5% of target with the current limits.");
    } else {
      setResultsScrollToken((n) => n + 1);
    }
  };

  useEffect(() => {
    if (!resultsScrollToken) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultsScrollToken]);

  const saveOutputToJob = async () => {
    if (typeof onSaveToJob !== "function") return;
    if (!results.length) {
      toast.warning("Calculate first, then save the output on this job.");
      return;
    }
    const snapshot = normalizeCmJobCalculation({
      savedAt: new Date().toISOString(),
      catalogWireUnit,
      selectedWireIds: [...selected],
      originalWiredInHand,
      originalWireSize,
      originalCM,
      targetedCM,
      minWires,
      maxWires,
      originalWireQtys,
      resultContext,
      results,
    });
    if (!snapshot?.results?.length) {
      toast.warning("That output could not be saved.");
      return;
    }
    try {
      const ok = await onSaveToJob(snapshot);
      if (ok) {
        setSavedSnapshot(snapshot);
        setOutputSaved(true);
      }
    } catch (err) {
      toast.error(err?.message || "Could not save this output.");
    }
  };

  const savedSummary = formatCmJobResultSummary(savedSnapshot);
  const jobNumberLabel = String(jobNumber || "").trim();
  const saveToJobLabel = jobNumberLabel ? `Save to Job#${jobNumberLabel}` : "Save to Job";
  const savedToJobLabel = jobNumberLabel ? `Saved to Job#${jobNumberLabel}` : "Saved";

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-6">
      {savedSummary ? (
        <div className="rounded-md border border-border bg-primary/[0.06] px-3 py-2 dark:bg-primary/10">
          <p className="text-xs font-bold uppercase tracking-wide text-secondary">Saved on this job</p>
          <p className="mt-0.5 text-sm font-semibold text-title">{savedSummary}</p>
          {savedSnapshot?.savedAt ? (
            <p className="mt-0.5 text-xs text-secondary">Saved {formatDateTime(savedSnapshot.savedAt)}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid min-h-0 gap-6 lg:grid-cols-2 lg:items-start">
        <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20">
          <p className="mb-4 text-xs text-secondary">
            Enter original winding data and search limits. Choose original wires and inventory sizes from the buttons below.
          </p>

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-3 sm:pr-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Original Inputs</h2>
              <Input
                label="Original Wires in Hand"
                type="text"
                inputMode="numeric"
                value={originalWiredInHand}
                onChange={(e) => setOriginalWiredInHand(e.target.value)}
                placeholder="10"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm text-title">Original Wire Size</span>
                <input
                  type="text"
                  value={originalWireSize}
                  onChange={(e) => setOriginalWireSize(e.target.value)}
                  placeholder="e.g. 12.5 #8, 13.5 #6"
                  className="w-full min-w-0 rounded-md border-[0.5px] border-border bg-bg px-3 py-2 text-text placeholder:text-sm placeholder:text-secondary focus:outline-none focus:ring-[0.5px] focus:ring-primary focus:border-primary/30"
                  aria-label="Original Wire Size"
                />
              </div>
              <Button
                type="button"
                size="sm"
                title="Choose Original Wires"
                aria-label="Choose Original Wires"
                className="!w-full !justify-start"
                onClick={() => setOriginalWiresModalOpen(true)}
              >
                <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                Choose Original Wires
              </Button>
              <Input
                label="Original CM"
                type="text"
                inputMode="decimal"
                value={originalCM}
                onChange={(e) => setOriginalCM(e.target.value)}
                placeholder="12360"
              />
            </div>
            <div className="mt-4 flex min-w-0 flex-col gap-3 border-t-2 border-title/35 pt-4 sm:mt-0 sm:border-l-2 sm:border-t-0 sm:pl-5 sm:pt-0">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Redesigned Input</h2>
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm text-title">Wires in Inventory</span>
                <input
                  type="text"
                  readOnly
                  value={inventoryWireDisplay}
                  placeholder="None selected"
                  className="w-full min-w-0 rounded-md border-[0.5px] border-border bg-bg px-3 py-2 text-text placeholder:text-sm placeholder:text-secondary focus:outline-none"
                  aria-label="Wires in Inventory"
                />
              </div>
              <Button
                type="button"
                size="sm"
                title="Choose Wires from inventory"
                aria-label="Choose Wires from inventory"
                className="!w-full !justify-start"
                onClick={() => setInventoryModalOpen(true)}
              >
                <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                Choose Wires from inventory
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Print inventory"
                aria-label="Print inventory"
                className="!w-full !justify-start"
                disabled={catalogLoading || wireRows.length === 0}
                onClick={printInventoryTable}
              >
                <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
                Print inventory
              </Button>
              <Input
                label="Targeted CM"
                type="text"
                inputMode="decimal"
                value={targetedCM}
                onChange={(e) => setTargetedCM(e.target.value)}
                placeholder="12360"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={clearBestMatchFields}>
              Clear fields
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={runCalculate}>
              Calculate Best Match
            </Button>
          </div>
          {typeof onSaveToJob === "function" ? (
            <p className="mt-3 text-xs text-secondary">
              After you calculate, the matches appear below. Save the output on this job from that section.
            </p>
          ) : null}
        </section>

        <aside
          className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-secondary"
          aria-label="How to run this calculator"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">Notes</p>
          <ol className="m-0 list-decimal space-y-2.5 pl-4">
            <li>
              <span className="font-medium text-title">Original winding.</span> Enter wires in hand, or use Choose Original Wires. That fills wire size, wire count, and original CM.
            </li>
            <li>
              <span className="font-medium text-title">Wire count limits.</span> Set desired min and max wires. Matches stay inside that range, using up to three sizes in parallel.
            </li>
            <li>
              <span className="font-medium text-title">Inventory.</span> Use Choose Wires from inventory and check the sizes to search. Up to 10 sizes. They show in Wires in Inventory. Print inventory prints that list.
            </li>
            <li>
              <span className="font-medium text-title">Targeted CM.</span> This is the search goal, within 5% either way. Choosing original wires copies original CM here. Change it if the redesign should land on a different CM.
            </li>
            <li>
              <span className="font-medium text-title">Calculate.</span> Click Calculate Best Match. Matches fill the table below. Green rows are within about 2% of target. Yellow rows are within about 5%.
            </li>
          </ol>
        </aside>
      </div>

      <section
          ref={resultsRef}
          className="rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20"
        >
          <div className="cm-print-hide mb-4 flex flex-wrap items-center justify-end gap-2">
            {typeof onSaveToJob === "function" && results.length > 0 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={savingToJob}
                onClick={saveOutputToJob}
              >
                {savingToJob ? "Saving…" : outputSaved ? savedToJobLabel : saveToJobLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              disabled={results.length === 0}
              title={results.length === 0 ? "Calculate first, then print the matches." : "Print matches"}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
            >
              <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
              Print
            </Button>
          </div>
          <CmBestMatchResultsBody
            areaId="cm-best-match-screen"
            results={results}
            resultContext={resultContext}
            generatedLabel={formatDateTime(new Date())}
          />
        </section>

      <Modal
        open={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        title="Select wire from inventory"
        size="lg"
        width="min(760px, 96vw)"
        height="min(86vh, 860px)"
        zIndex={80}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={catalogLoading || wireRows.length === 0}
            onClick={printInventoryTable}
          >
            <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
            Print
          </Button>
        }
      >
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex w-full flex-wrap items-start gap-3">
            <WireUnitToggle wireUnit={catalogWireUnit} onUnitChange={setCatalogUnit} disabled={cirMillsLoading} />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="ml-auto shrink-0"
              disabled={clearableOnCurrentList === 0}
              onClick={clearCatalogCurrentUnit}
            >
              Clear {unitToggleLabel}
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
              Add a missing wire size below, or ask an admin to seed the Cir Mills table.
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

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
              Add the missing wire size in the table above
            </h3>
            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3 dark:bg-muted/10 sm:flex-row sm:flex-wrap sm:items-end">
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
                {savingWire ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <DocumentPrintOffscreenPortal open={Boolean(inventoryPrint)} onClose={() => setInventoryPrint(null)}>
        {inventoryPrint ? <WireInventoryPrintSheet {...inventoryPrint} /> : null}
      </DocumentPrintOffscreenPortal>

      <DocumentPrintOffscreenPortal open={resultsPrint} onClose={() => setResultsPrint(false)}>
        {resultsPrint && resultContext && results.length > 0 ? (
          <CmBestMatchResultsBody
            results={results}
            resultContext={resultContext}
            generatedLabel={formatDateTime(new Date())}
          />
        ) : null}
      </DocumentPrintOffscreenPortal>

      <OriginalWiresSelectModal
        open={originalWiresModalOpen}
        onClose={() => setOriginalWiresModalOpen(false)}
        customWireRows={customWireRows}
        catalogsByUnit={catalogsByUnit}
        loading={catalogLoading}
        initialQtys={originalWireQtys}
        onApply={applyOriginalWireSelection}
      />
    </div>
  );
}
