"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiMail, FiPlus, FiPrinter, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { calculateCMBestMatch } from "@/lib/cm-calculator";
import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  DEFAULT_CIR_MILLS_ROWS,
  DEFAULT_METRIC_CIR_MILLS_ROWS,
  compareWireSizeDesc,
  formatOriginalWireSelection,
  normalizeCirMillsUnit,
} from "@/lib/platform-cir-mills";
import { appFetch } from "./api";
import { useIqwireAuth } from "./auth-context";
import IqwirePrintResults, { CmPrintSheet } from "./print-results";

const MAX_SELECT = 10;
const MAX_WIRES_CAP = 200;
const MAX_CUSTOM = 100;

function num(v) {
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function emptyDash(v) {
  const s = String(v ?? "").trim();
  return s || "-";
}

function platformId(unit, size) {
  return `${normalizeCirMillsUnit(unit)}-${String(size)}`;
}

function buildPlatformRows(unit) {
  const u = normalizeCirMillsUnit(unit);
  const seed = u === CIR_MILLS_UNIT_METRIC ? DEFAULT_METRIC_CIR_MILLS_ROWS : DEFAULT_CIR_MILLS_ROWS;
  return seed
    .map((w) => ({
      id: platformId(u, w.size),
      size: String(w.size),
      circularMills: Number(w.circularMills) || 0,
      custom: false,
      wireUnit: u,
    }))
    .sort(compareWireSizeDesc);
}

function combinationLabel(row) {
  const parts = [];
  for (let i = 1; i <= 3; i += 1) {
    const q = row[`wires${i}`];
    const s = row[`wireSize${i}`];
    if (q > 0 && s) parts.push(`${q}#${s}`);
  }
  return parts.join(" | ") || "-";
}

function matchVariant(pct) {
  const a = Math.abs(Number(pct) || 0);
  if (a <= 2) return "success";
  if (a <= 5) return "warning";
  return "default";
}

function UnitToggle({ value, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-form-bg p-0.5" role="group" aria-label="Wire unit">
      {[
        { id: CIR_MILLS_UNIT_AWG, label: "AWG" },
        { id: CIR_MILLS_UNIT_METRIC, label: "Metric" },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.id)}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            value === opt.id ? "bg-primary text-white" : "text-secondary hover:bg-card hover:text-title"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function CalculatorScreen({ pendingSaved, onConsumedSaved }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { token, unlocked } = useIqwireAuth();
  const [pageTab, setPageTab] = useState("job");
  const [catalogUnit, setCatalogUnit] = useState(CIR_MILLS_UNIT_AWG);
  const [customWires, setCustomWires] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [newSize, setNewSize] = useState("");
  const [newCm, setNewCm] = useState("");
  const [originalWiredInHand, setOriginalWiredInHand] = useState("");
  const [originalWireSize, setOriginalWireSize] = useState("");
  const [originalCM, setOriginalCM] = useState("");
  const [targetedCM, setTargetedCM] = useState("");
  const [minWires, setMinWires] = useState("3");
  const [maxWires, setMaxWires] = useState("10");
  const [results, setResults] = useState([]);
  const [resultContext, setResultContext] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsTitle, setResultsTitle] = useState("CM Best Match");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerUnit, setPickerUnit] = useState(CIR_MILLS_UNIT_AWG);
  const [originalWireQtys, setOriginalWireQtys] = useState({});
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const platformRows = useMemo(() => buildPlatformRows(catalogUnit), [catalogUnit]);
  const allPlatformRows = useMemo(
    () => [...buildPlatformRows(CIR_MILLS_UNIT_AWG), ...buildPlatformRows(CIR_MILLS_UNIT_METRIC)],
    []
  );
  const allCustomRows = useMemo(
    () =>
      (Array.isArray(customWires) ? customWires : [])
        .filter((w) => w && w.id && w.size)
        .map((w) => ({
          id: String(w.id),
          size: String(w.size).trim(),
          circularMills: Number(w.circularMills) || 0,
          custom: true,
          wireUnit: normalizeCirMillsUnit(w.wireUnit),
        }))
        .sort(compareWireSizeDesc),
    [customWires]
  );
  const customRows = useMemo(
    () => allCustomRows.filter((w) => w.wireUnit === catalogUnit),
    [allCustomRows, catalogUnit]
  );
  const catalogRows = useMemo(() => [...customRows, ...platformRows], [platformRows, customRows]);
  const allSelectableRows = useMemo(
    () => [...allCustomRows, ...allPlatformRows],
    [allPlatformRows, allCustomRows]
  );
  const selectedList = useMemo(
    () => allSelectableRows.filter((w) => selected.has(w.id)),
    [allSelectableRows, selected]
  );

  const loadCatalog = useCallback(async () => {
    if (!token) return;
    try {
      const data = await appFetch("/api/mobile-app/wire-catalog", { token });
      setCustomWires(Array.isArray(data.customWires) ? data.customWires : []);
    } catch {
      setCustomWires([]);
    }
  }, [token]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!pendingSaved) return;
    const payload = pendingSaved.results && typeof pendingSaved.results === "object" ? pendingSaved.results : {};
    const rows = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.top) ? payload.top : [];
    const ctx = payload.context || null;
    if (ctx) {
      setOriginalWiredInHand(ctx.originalWiredInHand === "-" ? "" : ctx.originalWiredInHand || "");
      setOriginalWireSize(ctx.originalWireSize === "-" ? "" : ctx.originalWireSize || "");
      setOriginalCM(ctx.originalCMDisplay === "-" ? "" : ctx.originalCMDisplay || "");
      setTargetedCM(ctx.targetedCM || "");
      setMinWires(ctx.minWires || "3");
      setMaxWires(ctx.maxWires || "10");
    }
    setResults(rows);
    setResultContext(ctx);
    setResultsTitle(pendingSaved.title || "Saved result");
    setResultsOpen(true);
    setPageTab("job");
    onConsumedSaved?.();
  }, [pendingSaved, onConsumedSaved]);

  const toggleId = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_SELECT) {
          toast.error(`Select at most ${MAX_SELECT} sizes.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const addCustom = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const data = await appFetch("/api/mobile-app/wire-catalog", {
        token,
        method: "POST",
        body: { size: newSize, circularMills: num(newCm), wireUnit: catalogUnit },
      });
      setCustomWires(Array.isArray(data.customWires) ? data.customWires : []);
      setNewSize("");
      setNewCm("");
      toast.success("Custom size added.");
    } catch (err) {
      toast.error(err.message || "Could not add size.");
    } finally {
      setAdding(false);
    }
  };

  const removeCustom = async (wire) => {
    const ok = await confirm({
      title: "Remove custom size",
      message: `Remove ${wire.size} from your catalog?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const data = await appFetch(`/api/mobile-app/wire-catalog?id=${encodeURIComponent(wire.id)}`, {
        token,
        method: "DELETE",
      });
      setCustomWires(Array.isArray(data.customWires) ? data.customWires : []);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(wire.id);
        return next;
      });
    } catch (err) {
      toast.error(err.message || "Could not remove size.");
    }
  };

  const applyOriginalWireSelection = (selections) => {
    const formatted = formatOriginalWireSelection(selections);
    setOriginalWireSize(formatted.display);
    if (formatted.totalQty > 0) setOriginalWiredInHand(String(formatted.totalQty));
    if (formatted.totalCm > 0) {
      setOriginalCM(String(formatted.totalCm));
      if (!targetedCM) setTargetedCM(String(formatted.totalCm));
    }
    setPickerOpen(false);
  };

  const applyPicker = () => {
    const selections = allSelectableRows
      .map((w) => {
        const qty = originalWireQtys[w.id];
        if (!qty) return null;
        return { id: w.id, size: w.size, qty, circularMills: w.circularMills };
      })
      .filter(Boolean);
    applyOriginalWireSelection(selections);
  };

  const runCalculate = (e) => {
    e?.preventDefault?.();
    const t = num(targetedCM);
    const minW = Math.floor(num(minWires));
    const maxW = Math.floor(num(maxWires));
    if (!Number.isFinite(t) || t <= 0) {
      toast.error("Enter a targeted CM greater than 0.");
      return;
    }
    if (!Number.isFinite(minW) || !Number.isFinite(maxW) || minW < 1 || maxW < minW) {
      toast.error("Desired min wires must be at least 1 and max must be at least min.");
      return;
    }
    if (maxW > MAX_WIRES_CAP) {
      toast.error(`Desired max wires is capped at ${MAX_WIRES_CAP}.`);
      return;
    }
    if (selectedList.length === 0) {
      toast.error("Select at least one wire size in Catalog.");
      setPageTab("catalog");
      return;
    }
    const wiresForCalc = selectedList
      .map((w) => ({ size: w.size, cm: Number(w.circularMills) || 0 }))
      .filter((w) => w.cm > 0);
    const ocm = num(originalCM);
    const ctx = {
      originalWiredInHand: emptyDash(originalWiredInHand),
      originalWireSize: emptyDash(originalWireSize),
      originalCMDisplay: Number.isFinite(ocm) && ocm > 0 ? String(ocm) : "-",
      targetedCM: String(t),
      minWires: String(minW),
      maxWires: String(maxW),
      selectedCatalogSummary: selectedList
        .map((w) => `${w.size}${w.wireUnit === CIR_MILLS_UNIT_METRIC ? " mm" : " AWG"} (${w.circularMills} CM)`)
        .join("; "),
    };
    const out = calculateCMBestMatch(wiresForCalc, t, minW, maxW);
    setResultContext(ctx);
    setResults(out);
    setResultsTitle("CM Best Match");
    if (out.length === 0) {
      setResultsOpen(false);
      toast.error("No combinations within ±5% of target with the current limits.");
    } else {
      setResultsOpen(true);
    }
  };

  const saveCalc = async (e) => {
    e.preventDefault();
    if (!unlocked) {
      toast.error("Your trial has ended. Subscribe to save calculations.");
      return;
    }
    const name = String(saveName || "").trim();
    if (!name) {
      toast.error("Enter a name for this calculation.");
      return;
    }
    setSaving(true);
    try {
      await appFetch("/api/mobile-app/saved", {
        token,
        method: "POST",
        body: {
          calculatorType: "cm_best_match",
          title: name,
          inputs: {
            originalWiredInHand,
            originalWireSize,
            originalCM,
            targetedCM,
            minWires,
            maxWires,
            selectedIds: [...selected],
          },
          results: { rows: results, context: resultContext },
        },
      });
      setSaveOpen(false);
      setSaveName("");
      toast.success(`Saved as "${name}".`);
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const emailResults = () => {
    const lines = [
      resultsTitle,
      `Targeted CM: ${resultContext?.targetedCM || ""}`,
      ...results.slice(0, 40).map(
        (row) =>
          `${combinationLabel(row)} · ${fmt(row.totalCM)} CM · ${row.percentDifference}% · ${row.wiresInHand} in hand`
      ),
    ];
    const body = lines.join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(resultsTitle)}&body=${encodeURIComponent(body)}`;
  };

  const pickerRows = useMemo(() => {
    const platform = buildPlatformRows(pickerUnit);
    const custom = allCustomRows.filter((w) => w.wireUnit === pickerUnit);
    return [...custom, ...platform];
  }, [allCustomRows, pickerUnit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => setPageTab("job")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${pageTab === "job" ? "bg-primary text-white" : "bg-card text-secondary ring-1 ring-border"}`}
        >
          Job
        </button>
        <button
          type="button"
          onClick={() => setPageTab("catalog")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${pageTab === "catalog" ? "bg-primary text-white" : "bg-card text-secondary ring-1 ring-border"}`}
        >
          Catalog
        </button>
      </div>

      {pageTab === "catalog" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <UnitToggle value={catalogUnit} onChange={setCatalogUnit} />
            <p className="text-xs text-secondary">{selected.size}/{MAX_SELECT} selected</p>
          </div>
          <Form id="iqwire-add-wire-form" onSubmit={addCustom} className="mb-3 space-y-3 p-4">
            <p className="text-sm font-semibold text-title">Add custom size</p>
            <Input label="Size" name="new-size" value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder={catalogUnit === CIR_MILLS_UNIT_METRIC ? "18.5" : "18.5"} />
            <Input label="Circular mils" name="new-cm" value={newCm} onChange={(e) => setNewCm(e.target.value)} placeholder="1440" />
            <Button type="submit" form="iqwire-add-wire-form" size="sm" disabled={adding || customWires.length >= MAX_CUSTOM}>
              {adding ? "Adding…" : "Add custom size"}
            </Button>
          </Form>
          <ul className="space-y-1 pb-4">
            {catalogRows.map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <Checkbox
                  name={`wire-${w.id}`}
                  checked={selected.has(w.id)}
                  onChange={() => toggleId(w.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-title">
                    {w.size}
                    {w.custom ? (
                      <Badge variant="primary" className="ml-2 rounded-full px-2 py-0.5 text-[10px]">
                        Custom
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-secondary">{fmt(w.circularMills)} CM</p>
                </div>
                {w.custom ? (
                  <button
                    type="button"
                    className="rounded-md p-2 text-danger hover:bg-danger/10"
                    aria-label={`Remove ${w.size}`}
                    onClick={() => removeCustom(w)}
                  >
                    <FiTrash2 className="h-4 w-4 shrink-0" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Catalog for search</p>
            <p className="mt-1 text-sm text-title">
              {selectedList.length === 0
                ? "No sizes selected. Open Catalog and choose up to 10 sizes."
                : selectedList.map((w) => `${w.size}${w.wireUnit === CIR_MILLS_UNIT_METRIC ? " mm" : " AWG"}`).join(", ")}
            </p>
            <button type="button" className="mt-1 text-sm font-semibold text-primary" onClick={() => setPageTab("catalog")}>
              Edit catalog
            </button>
          </div>
          <Form id="iqwire-cm-form" onSubmit={runCalculate} className="space-y-3 p-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOriginalWiredInHand("");
                  setOriginalWireSize("");
                  setOriginalCM("");
                  setTargetedCM("");
                  setMinWires("3");
                  setMaxWires("10");
                }}
              >
                Clear fields
              </Button>
              {results.length > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setResultsOpen(true)}>
                  View results ({results.length})
                </Button>
              ) : null}
            </div>
            <Input
              label="Original wires in hand"
              name="orig-hand"
              value={originalWiredInHand}
              onChange={(e) => setOriginalWiredInHand(e.target.value)}
              placeholder="10"
            />
            <div className="flex items-end gap-2">
              <Input
                className="flex-1"
                label="Original wire size"
                name="orig-size"
                value={originalWireSize}
                onChange={(e) => setOriginalWireSize(e.target.value)}
                placeholder="e.g. 12.5 #8, 13.5 #6"
              />
              <Button type="button" size="sm" onClick={() => setPickerOpen(true)} aria-label="Select original wires">
                <FiPlus className="h-4 w-4 shrink-0" />
              </Button>
            </div>
            <Input label="Original CM" name="orig-cm" value={originalCM} onChange={(e) => setOriginalCM(e.target.value)} />
            <Input
              label="Targeted CM"
              name="target-cm"
              value={targetedCM}
              onChange={(e) => setTargetedCM(e.target.value)}
              placeholder="12360"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Desired min wires" name="min-wires" value={minWires} onChange={(e) => setMinWires(e.target.value)} />
              <Input label="Desired max wires" name="max-wires" value={maxWires} onChange={(e) => setMaxWires(e.target.value)} />
            </div>
            <p className="text-xs leading-relaxed text-secondary">
              Targeted CM is the search goal (±5%). Desired min/max limit total conductors. Up to 3 wire sizes may be used in parallel.
            </p>
            <Button type="submit" form="iqwire-cm-form" className="w-full">
              Calculate Best Match
            </Button>
          </Form>
        </div>
      )}

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select original wires"
        size="md"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applyPicker}>
              Apply selection
            </Button>
          </>
        }
      >
        <UnitToggle value={pickerUnit} onChange={setPickerUnit} />
        <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
          {pickerRows.map((w) => (
            <li key={w.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-title">{w.size}</p>
                <p className="text-xs text-secondary">{fmt(w.circularMills)} CM</p>
              </div>
              <input
                className="w-20 rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
                value={originalWireQtys[w.id] || ""}
                onChange={(e) =>
                  setOriginalWireQtys((prev) => {
                    const next = { ...prev };
                    const cleaned = String(e.target.value || "").replace(/[^0-9.]/g, "");
                    if (!cleaned) delete next[w.id];
                    else next[w.id] = cleaned;
                    return next;
                  })
                }
                placeholder="Qty"
                inputMode="decimal"
              />
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        title={resultsTitle}
        size="lg"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setSaveOpen(true)} disabled={!results.length}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setPrintOpen(true)} disabled={!results.length}>
              <FiPrinter className="h-4 w-4 shrink-0" />
              Print
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={emailResults} disabled={!results.length}>
              <FiMail className="h-4 w-4 shrink-0" />
              Email
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setResultsOpen(false)}>
              Close
            </Button>
          </>
        }
      >
        {resultContext ? (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/10 p-3 text-sm">
            <div>
              <p className="text-xs text-secondary">Original wires in hand</p>
              <p className="font-semibold text-title">{resultContext.originalWiredInHand}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Original wire size</p>
              <p className="font-semibold text-title">{resultContext.originalWireSize}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Original CM</p>
              <p className="font-semibold text-title">{resultContext.originalCMDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Targeted CM</p>
              <p className="font-semibold text-title">{resultContext.targetedCM}</p>
            </div>
          </div>
        ) : null}
        <p className="mb-2 text-xs text-secondary">
          <span className="text-success">Green</span> within ~2%. <span className="text-warning">Yellow</span> within ~5%.
        </p>
        <ul className="space-y-2">
          {results.map((row, idx) => (
            <li key={idx} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-title">{combinationLabel(row)}</p>
                <Badge variant={matchVariant(row.percentDifference)} className="rounded-full px-2.5 py-0.5 text-xs">
                  {row.percentDifference > 0 ? "+" : ""}
                  {row.percentDifference}%
                </Badge>
              </div>
              <p className="mt-1 text-sm text-secondary">
                Total CM {fmt(row.totalCM)} · {fmt(row.cmDifference)} CM Δ · {row.wiresInHand} in hand
              </p>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save calculation"
        size="sm"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" form="iqwire-save-form" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="iqwire-save-form" onSubmit={saveCalc} className="space-y-3 p-0 shadow-none ring-0">
          <Input
            label="Calculation name"
            name="save-name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Job 4412 mix"
            required
          />
        </Form>
      </Modal>

      <IqwirePrintResults open={printOpen} onClose={() => setPrintOpen(false)}>
        <CmPrintSheet
          title={resultsTitle}
          results={results}
          resultContext={resultContext}
          generatedLabel={new Date().toLocaleString()}
        />
      </IqwirePrintResults>
    </div>
  );
}
