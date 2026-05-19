"use client";

import { useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { DROPDOWN_DEFINITIONS } from "@/lib/dropdown-catalog";
import { mergeUserSettings } from "@/lib/user-settings";
import { WORK_ORDER_STATUS_TILE_PRESETS, resolveTilePresetClass } from "@/lib/work-order-status-tiles";

const TILE_SELECT_OPTIONS = [
  { value: "", label: "Auto (by position)" },
  ...WORK_ORDER_STATUS_TILE_PRESETS.map((p, i) => ({
    value: String(i),
    label: p.label,
  })),
];

const MAX_OPTIONS = 25;

function syncWorkOrderLegacy(setDraft, woEntries) {
  const tc = {};
  for (const e of woEntries) {
    if (e.value && e.tileColor) tc[e.value] = String(e.tileColor);
  }
  setDraft((prev) => ({
    ...prev,
    controlledDropdowns: {
      ...(prev.controlledDropdowns && typeof prev.controlledDropdowns === "object" ? prev.controlledDropdowns : {}),
      work_order_status: { entries: woEntries },
    },
    workOrderStatuses: woEntries.map((e) => e.value).filter(Boolean).slice(0, MAX_OPTIONS),
    workOrderStatusTileColors: tc,
    shopFloorBoardOrder: (Array.isArray(prev.shopFloorBoardOrder) ? prev.shopFloorBoardOrder : []).filter((x) =>
      woEntries.some((e) => e.value === x)
    ),
  }));
}

export default function SettingsControlledDropdownsPanel({ draft, setDraft }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedKey, setSelectedKey] = useState("quote_status");
  const [drafts, setDrafts] = useState({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const merged = useMemo(() => mergeUserSettings(draft), [draft]);
  const quoteEntries = merged.controlledDropdowns?.quote_status?.entries ?? [];
  const woEntries = merged.controlledDropdowns?.work_order_status?.entries ?? [];
  const invoiceEntries = merged.controlledDropdowns?.invoice_status?.entries ?? [];

  const dropdownSelectOptions = useMemo(
    () =>
      Object.values(DROPDOWN_DEFINITIONS).map((d) => ({
        value: d.key,
        label: d.label,
      })),
    []
  );

  const patchInvoiceEntries = (nextEntries) => {
    setDraft((prev) => ({
      ...prev,
      controlledDropdowns: {
        ...(prev.controlledDropdowns && typeof prev.controlledDropdowns === "object" ? prev.controlledDropdowns : {}),
        invoice_status: { entries: nextEntries },
      },
    }));
  };

  const patchQuoteEntries = (nextEntries) => {
    setDraft((prev) => ({
      ...prev,
      controlledDropdowns: {
        ...(prev.controlledDropdowns && typeof prev.controlledDropdowns === "object" ? prev.controlledDropdowns : {}),
        quote_status: { entries: nextEntries },
      },
    }));
  };

  const patchWoEntries = (nextEntries) => {
    syncWorkOrderLegacy(setDraft, nextEntries);
  };

  const selectedDef = DROPDOWN_DEFINITIONS[selectedKey];
  const entries =
    selectedKey === "quote_status" ? quoteEntries : selectedKey === "invoice_status" ? invoiceEntries : woEntries;
  const showEntryLabels = selectedKey === "quote_status" || selectedKey === "invoice_status";

  const patchEntries = (next) => {
    if (selectedKey === "quote_status") patchQuoteEntries(next);
    else if (selectedKey === "invoice_status") patchInvoiceEntries(next);
    else patchWoEntries(next);
  };

  const chipLabel = (row) => (showEntryLabels ? row.label || row.value : row.value);

  const addValue = () => {
    const nextVal = (drafts[selectedKey] || "").trim();
    if (!nextVal) return;
    if (entries.some((e) => e.value.toLowerCase() === nextVal.toLowerCase())) {
      toast.error("That value already exists.");
      return;
    }
    if (entries.length >= MAX_OPTIONS) {
      toast.error(`Maximum ${MAX_OPTIONS} values.`);
      return;
    }
    patchEntries([...entries, { value: nextVal.slice(0, 80), label: "", tileColor: "" }]);
    setDrafts((p) => ({ ...p, [selectedKey]: "" }));
    toast.success("Value added.");
  };

  const removeValue = async (value) => {
    if (entries.length <= 1) {
      toast.error("Keep at least one value.");
      return;
    }
    const ok = await confirm({
      title: "Delete option?",
      message: `Delete "${value}" from ${selectedDef?.label || "this dropdown"}? Existing quotes, work orders, or invoices may still use this value until you edit them.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    patchEntries(entries.filter((e) => e.value !== value));
    toast.success("Value deleted.");
  };

  const moveEntry = (idx, delta) => {
    const j = idx + delta;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    [next[idx], next[j]] = [next[j], next[idx]];
    patchEntries(next);
  };

  const openBulk = () => {
    setBulkText(entries.map((e) => e.value).join("\n"));
    setBulkOpen(true);
  };

  const saveBulk = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, MAX_OPTIONS);
    if (!lines.length) {
      toast.error("Add at least one line.");
      return;
    }
    const prevByLower = new Map(entries.map((e) => [e.value.toLowerCase(), e]));
    const next = lines.map((value) => {
      const prev = prevByLower.get(value.toLowerCase());
      return {
        value: value.slice(0, 80),
        label: prev?.label ?? "",
        tileColor: prev?.tileColor || "",
      };
    });
    setBulkSaving(true);
    patchEntries(next);
    toast.success("Values updated.");
    setBulkOpen(false);
    setBulkSaving(false);
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
      <FormContainer>
        <FormSectionTitle as="h2">Controlled dropdowns</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Define option lists for your shop. Add values below, delete with the trash icon or × on each chip, reorder rows,
          set display labels (quotes and invoices), and pick tile colors for badges and the shop floor. Save settings when finished.
        </p>
        <div className="max-w-md">
          <Select
            label="Select dropdown"
            options={dropdownSelectOptions}
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value || "quote_status")}
            searchable={false}
          />
        </div>
      </FormContainer>

      {selectedDef ? (
        <FormContainer>
          <FormSectionTitle as="h2">{selectedDef.label}</FormSectionTitle>
          <p className="mb-4 text-xs text-secondary">
            Total values: {entries.length}. Quote statuses are stored on each RFQ; keep an{" "}
            <span className="font-medium text-title">approved</span>-labeled option if you use{" "}
            <span className="font-medium text-title">Create work order</span> from Quotes (API checks that slug). For
            invoices, keep slugs like <span className="font-medium text-title">sent</span>,{" "}
            <span className="font-medium text-title">partial_paid</span>, and{" "}
            <span className="font-medium text-title">fully_paid</span> if you use email send and payment recording.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {entries.map((row, chipIdx) => (
              <span
                key={row.value}
                className={`job-board-status-pill inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm ring-1 ring-inset ${resolveTilePresetClass(row.tileColor, chipIdx)}`}
              >
                {chipLabel(row)}
                <button
                  type="button"
                  onClick={() => removeValue(row.value)}
                  className="rounded p-0.5 text-secondary hover:bg-card hover:text-danger"
                  aria-label={`Delete ${chipLabel(row)}`}
                  title={`Delete ${chipLabel(row)}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-border bg-form-bg/80 text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                <tr>
                  <th className="w-12 px-3 py-2" aria-label="Actions" />
                  <th className="w-24 px-3 py-2">Order</th>
                  <th className="px-3 py-2">Value</th>
                  {showEntryLabels ? <th className="px-3 py-2">Display label</th> : null}
                  <th className="px-3 py-2">Tile color</th>
                  <th className="px-3 py-2 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((row, idx) => (
                  <tr key={row.value}>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeValue(row.value)}
                        disabled={entries.length <= 1}
                        className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Delete ${chipLabel(row)}`}
                        title={entries.length <= 1 ? "Keep at least one value" : `Delete ${chipLabel(row)}`}
                      >
                        <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-card"
                          aria-label="Move up"
                          onClick={() => moveEntry(idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-card"
                          aria-label="Move down"
                          onClick={() => moveEntry(idx, 1)}
                          disabled={idx === entries.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-medium text-title">{row.value}</td>
                    {showEntryLabels ? (
                      <td className="px-3 py-2">
                        <Input
                          value={row.label ?? ""}
                          onChange={(e) => {
                            const next = [...entries];
                            next[idx] = { ...next[idx], label: e.target.value ?? "" };
                            patchEntries(next);
                          }}
                          className="!gap-0"
                          placeholder={row.value}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <Select
                        options={TILE_SELECT_OPTIONS}
                        value={row.tileColor ?? ""}
                        onChange={(e) => {
                          const next = [...entries];
                          next[idx] = { ...next[idx], tileColor: e.target.value ?? "" };
                          patchEntries(next);
                        }}
                        searchable={false}
                        className="min-w-[11rem]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`job-board-status-pill inline-flex max-w-[10rem] truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${resolveTilePresetClass(row.tileColor, idx)}`}
                      >
                        {chipLabel(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Input
              label="Add value"
              className="min-w-[240px] flex-1"
              value={drafts[selectedKey] || ""}
              onChange={(e) => setDrafts((p) => ({ ...p, [selectedKey]: e.target.value }))}
              placeholder={
                selectedKey === "quote_status"
                  ? "e.g. pending_review"
                  : selectedKey === "invoice_status"
                    ? "e.g. awaiting_payment"
                    : "New status"
              }
            />
            <Button type="button" variant="outline" onClick={addValue}>
              Add
            </Button>
            <Button type="button" variant="outline" onClick={openBulk}>
              Bulk edit
            </Button>
          </div>
        </FormContainer>
      ) : null}

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={`Bulk edit: ${selectedDef?.label ?? "Dropdown"}`}
        width="min(640px, 92vw)"
      >
        <p className="text-sm text-secondary">
          One value per line (max {MAX_OPTIONS}).           Existing tile colors and labels are kept when the value matches a previous line; otherwise those fields reset.
        </p>
        <div className="mt-4">
          <Textarea
            label="Values"
            rows={14}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={
              selectedKey === "quote_status"
                ? "draft\nsent\napproved"
                : selectedKey === "invoice_status"
                  ? "draft\nsent\npartial_paid\nfully_paid"
                  : "Assigned\nIn Progress\nQC"
            }
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={bulkSaving} onClick={saveBulk}>
            {bulkSaving ? "Saving…" : "Save values"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
