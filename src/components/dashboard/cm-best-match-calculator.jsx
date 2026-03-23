"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPrinter, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { calculateCMBestMatch } from "@/lib/cm-calculator";
import { useToast } from "@/components/toast-provider";
import "./cm-best-match-print.css";

const MAX_SELECT = 10;
const MAX_WIRES_CAP = 200;

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
  if (a <= 10) return "bg-amber-400/25 dark:bg-amber-500/15";
  return "bg-card";
}

/** Print stylesheet row tint (see cm-best-match-print.css) */
function resultRowPrintClass(percentDifference) {
  const a = Math.abs(Number(percentDifference) || 0);
  if (a <= 2) return "cm-print-row-good";
  if (a <= 10) return "cm-print-row-mid";
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

/** Printable + on-screen results: variables + table (id required for print CSS) */
function CmBestMatchResultsBody({ results, resultContext }) {
  if (!resultContext || !results?.length) return null;

  return (
    <div id="cm-best-match-print-area" className="text-title">
      <h1 className="cm-print-title mb-1 text-lg font-bold text-title lg:text-xl">CM Best Match</h1>
      <p className="cm-print-meta mb-4 text-xs text-secondary">
        Generated {new Date().toLocaleString()} · Print uses landscape (use Print preview in your browser).
      </p>

      <div className="cm-print-vars mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/10 p-4 sm:grid-cols-3 dark:bg-muted/5">
        <VarCell label="Original Wires in Hand" value={resultContext.originalWiredInHand} />
        <VarCell label="Original Wire Size" value={resultContext.originalWireSize} />
        <VarCell label="Original CM" value={resultContext.originalCMDisplay} />
        <VarCell label="Targeted CM" value={resultContext.targetedCM} />
        <VarCell label="Min Wires" value={resultContext.minWires} />
        <VarCell label="Max Wires" value={resultContext.maxWires} />
        {resultContext.selectedCatalogSummary ? (
          <div className="cm-print-selected sm:col-span-2 lg:col-span-3">
            <span className="cm-var-label text-xs font-medium text-secondary">Catalog sizes used in search</span>
            <p className="cm-var-value mt-1 text-sm leading-snug text-title">{resultContext.selectedCatalogSummary}</p>
          </div>
        ) : null}
      </div>

      <p className="cm-print-hide mb-3 text-xs text-secondary">
        Rows in <span className="text-emerald-700 dark:text-emerald-400">green</span> are within ~2% of target;{" "}
        <span className="text-amber-800 dark:text-amber-400">yellow</span> within ~10%. Unused wire slots show 0.
      </p>

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
            {results.map((row, idx) => (
              <tr
                key={idx}
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
                <td className="px-2 py-2 tabular-nums text-secondary">{row.cmDifference}</td>
                <td className="px-2 py-2 tabular-nums text-secondary">{row.noOfWires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CmBestMatchCalculator() {
  const toast = useToast();
  const [wireRows, setWireRows] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [newSize, setNewSize] = useState("");
  const [newCm, setNewCm] = useState("");
  const [savingWire, setSavingWire] = useState(false);

  const loadWires = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/wire-sizes", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      const list = Array.isArray(data) ? data : [];
      setWireRows(list);
      setSelected((prev) => {
        const next = new Set();
        for (const row of list) {
          if (row.id && prev.has(row.id)) next.add(row.id);
        }
        return next;
      });
    } catch (e) {
      toast.error(e.message || "Could not load wire sizes");
      setWireRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWires();
  }, [loadWires]);

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

  const firstNIds = useMemo(() => wireRows.map((w) => w.id).filter(Boolean).slice(0, MAX_SELECT), [wireRows]);

  const allCatalogSelected = useMemo(() => {
    if (firstNIds.length === 0) return false;
    return firstNIds.every((id) => selected.has(id));
  }, [firstNIds, selected]);

  const selectedList = useMemo(() => {
    return wireRows.filter((w) => w.id && selected.has(w.id));
  }, [wireRows, selected]);

  const wiresForCalc = useMemo(() => {
    return selectedList.map((w) => ({ size: w.size, cm: Number(w.circularMills) || 0 })).filter((w) => w.cm > 0);
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

  const selectAll = () => {
    const ids = wireRows.map((w) => w.id).filter(Boolean).slice(0, MAX_SELECT);
    setSelected(new Set(ids));
    if (wireRows.length > MAX_SELECT) {
      toast.warning(`Only the first ${MAX_SELECT} sizes were selected (limit).`);
    }
  };

  const clearSelection = () => setSelected(new Set());

  const toggleSelectAllCheckbox = () => {
    if (allCatalogSelected) clearSelection();
    else selectAll();
  };

  const handlePrint = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.print();
    });
  }, []);

  const runCalculate = () => {
    const t = num(targetedCM);
    const minW = Math.floor(num(minWires));
    const maxW = Math.floor(num(maxWires));

    if (!Number.isFinite(t) || t <= 0) {
      toast.warning("Enter a valid targeted CM (circular mils).");
      return;
    }
    if (!Number.isFinite(minW) || !Number.isFinite(maxW)) {
      toast.warning("Enter valid min and max wire counts.");
      return;
    }
    if (minW < 1 || maxW < minW) {
      toast.warning("Min wires must be ≥ 1 and max wires must be ≥ min.");
      return;
    }
    if (maxW > MAX_WIRES_CAP) {
      toast.warning(`Max wires is capped at ${MAX_WIRES_CAP} for performance.`);
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
      selectedCatalogSummary: selectedList.map((w) => `${w.size} (${w.circularMills} CM)`).join("; "),
    };
    setResultContext(ctx);

    const out = calculateCMBestMatch(wiresForCalc, t, minW, maxW);
    setResults(out);
    if (out.length === 0) {
      setResultsModalOpen(false);
      toast.info("No combinations within ±10% of target with the current limits.");
    } else {
      setResultsModalOpen(true);
    }
  };

  const addWire = async () => {
    const size = newSize.trim();
    const cm = num(newCm);
    if (!size) {
      toast.warning("Enter a wire size label (e.g. 18 or 18 AWG).");
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
      await loadWires();
      toast.success("Wire size added.");
    } catch (e) {
      toast.error(e.message || "Could not add wire size");
    } finally {
      setSavingWire(false);
    }
  };

  const removeWire = async (id) => {
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
      await loadWires();
      toast.success("Wire size removed.");
    } catch (e) {
      toast.error(e.message || "Could not remove");
    }
  };

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-6">
      <div className="grid min-h-0 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left: Wire catalog */}
        <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-title">Wire catalog</h2>
          <p className="mb-4 text-xs text-secondary">
            Use <strong className="text-title">Select all</strong> then pick sizes to include. Up to {MAX_SELECT} selections.
          </p>

          <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3 dark:bg-muted/10 sm:flex-row sm:flex-wrap sm:items-end">
            <Input
              label="New size"
              className="min-w-0 flex-1 sm:min-w-[100px]"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              placeholder="e.g. 19 or 18.5"
            />
            <Input
              label="Circular mils"
              className="w-full sm:w-32"
              type="text"
              inputMode="decimal"
              value={newCm}
              onChange={(e) => setNewCm(e.target.value)}
              placeholder="12360"
            />
            <Button type="button" variant="outline" size="sm" onClick={addWire} disabled={savingWire} className="shrink-0">
              {savingWire ? "Adding…" : "Add"}
            </Button>
          </div>

          {wireRows.length > 0 ? (
            <div className="mb-2">
              <Checkbox
                label="Select all"
                checked={allCatalogSelected && firstNIds.length > 0}
                onChange={toggleSelectAllCheckbox}
                disabled={loading || wireRows.length === 0}
              />
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-secondary">Loading wire sizes…</p>
          ) : wireRows.length === 0 ? (
            <p className="text-sm text-secondary">Add wire sizes above to build your list (gauge + circular mils).</p>
          ) : (
            <div className="min-h-[220px] max-h-[min(420px,calc(100vh-340px))] flex-1 overflow-auto rounded-md border border-border bg-bg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] border-b border-border bg-card">
                  <tr>
                    <th className="w-10 px-2 py-2 text-left" aria-label="Select" />
                    <th className="px-3 py-2 text-left font-medium text-title">Size</th>
                    <th className="px-3 py-2 text-right font-medium text-title">CM</th>
                    <th className="w-12 px-2 py-2" aria-label="Delete" />
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
                      <td className="px-3 py-2 tabular-nums text-title">{w.size}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-secondary">{w.circularMills}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => w.id && removeWire(w.id)}
                          className="rounded p-1.5 text-secondary hover:bg-danger/10 hover:text-danger"
                          aria-label={`Remove ${w.size}`}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {wireRows.length > 0 ? (
            <p className="mt-2 text-xs text-secondary">
              {selected.size} of {wireRows.length} selected (max {MAX_SELECT} used for calc)
            </p>
          ) : null}
        </section>

        {/* Right: inputs */}
        <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-title">CM Best Match</h2>
          <p className="mb-4 text-xs text-secondary">
            Enter original winding data and search limits. Choose wire sizes in the catalog at left.
          </p>

          <div className="mb-4 flex flex-wrap items-center justify-end gap-3 border-b border-border pb-4">
            {results.length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setResultsModalOpen(true)}>
                View results ({results.length})
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="sm" onClick={runCalculate}>
              Calculate Best Match
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Original Wires in Hand"
              type="text"
              inputMode="numeric"
              value={originalWiredInHand}
              onChange={(e) => setOriginalWiredInHand(e.target.value)}
              placeholder="10"
            />
            <Input
              label="Original Wire Size"
              type="text"
              inputMode="decimal"
              value={originalWireSize}
              onChange={(e) => setOriginalWireSize(e.target.value)}
              placeholder="19"
            />
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
              label="Min Wires"
              type="text"
              inputMode="numeric"
              value={minWires}
              onChange={(e) => setMinWires(e.target.value)}
            />
            <Input
              label="Max Wires"
              type="text"
              inputMode="numeric"
              value={maxWires}
              onChange={(e) => setMaxWires(e.target.value)}
            />
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
                  Number of parallel conductors in the existing winding you are matching (for reference on the results
                  sheet).
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Original Wire Size</dt>
                <dd className="mt-0.5 text-secondary">
                  Wire gauge or size label from the job (reference only; circular mils drive the math).
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Original CM</dt>
                <dd className="mt-0.5 text-secondary">
                  Circular mils of the original conductor (from your catalog or wire tables). Shown on printouts with the
                  other originals.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Targeted CM</dt>
                <dd className="mt-0.5 text-secondary">
                  Total circular mils you want the new combination to land on. The tool searches within ±10% of this
                  value using only sizes you selected in the catalog.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-title">Min Wires / Max Wires</dt>
                <dd className="mt-0.5 text-secondary">
                  Allowed total conductor count in a combination (all wires in parallel, up to three different sizes).
                  Results stay between these limits.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

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
          <CmBestMatchResultsBody results={results} resultContext={resultContext} />
        </Modal>
      ) : null}
    </div>
  );
}
