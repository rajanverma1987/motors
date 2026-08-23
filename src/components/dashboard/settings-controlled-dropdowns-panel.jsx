"use client";

import { useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Checkbox from "@/components/ui/checkbox";
import TileColorPicker from "@/components/ui/tile-color-picker";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { DROPDOWN_DEFINITIONS, filterGroupKey } from "@/lib/dropdown-catalog";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveStatusTileProps, serializeTileColorForMap } from "@/lib/work-order-status-tiles";

const MAX_OPTIONS = 25;

function syncWorkOrderLegacy(setDraft, woEntries) {
  const tc = {};
  for (const e of woEntries) {
    if (!e.value) continue;
    const serialized = serializeTileColorForMap(e);
    if (serialized) tc[e.value] = serialized;
  }
  setDraft((prev) => ({
    ...prev,
    controlledDropdowns: {
      ...(prev.controlledDropdowns && typeof prev.controlledDropdowns === "object" ? prev.controlledDropdowns : {}),
      work_order_status: { entries: woEntries },
    },
    workOrderStatuses: woEntries.map((e) => e.value).filter(Boolean).slice(0, MAX_OPTIONS),
    workOrderStatusTileColors: tc,
    shopFloorBoardOrder: woEntries.filter((e) => e.showOnShopFloor !== false).map((e) => e.value),
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
  const poPaymentEntries = merged.controlledDropdowns?.po_payment_status?.entries ?? [];

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

  const patchPoPaymentEntries = (nextEntries) => {
    setDraft((prev) => ({
      ...prev,
      controlledDropdowns: {
        ...(prev.controlledDropdowns && typeof prev.controlledDropdowns === "object" ? prev.controlledDropdowns : {}),
        po_payment_status: { entries: nextEntries },
      },
    }));
  };

  const selectedDef = DROPDOWN_DEFINITIONS[selectedKey];
  const isFixedValues = Boolean(selectedDef?.fixedValues);
  const entries =
    selectedKey === "quote_status"
      ? quoteEntries
      : selectedKey === "invoice_status"
        ? invoiceEntries
        : selectedKey === "po_payment_status"
          ? poPaymentEntries
          : woEntries;
  const showEntryLabels =
    selectedKey === "quote_status" ||
    selectedKey === "invoice_status" ||
    selectedKey === "po_payment_status";
  const showQuoteFilterGroupColumns = selectedKey === "quote_status";
  const showShopFloorColumn = selectedKey === "work_order_status";

  const patchEntries = (next) => {
    if (selectedKey === "quote_status") patchQuoteEntries(next);
    else if (selectedKey === "invoice_status") patchInvoiceEntries(next);
    else if (selectedKey === "po_payment_status") patchPoPaymentEntries(next);
    else patchWoEntries(next);
  };

  const chipLabel = (row) => (showEntryLabels ? row.label || row.value : row.value);

  const addValue = () => {
    if (isFixedValues) return;
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
    patchEntries([
      ...entries,
      {
        value: nextVal.slice(0, 80),
        label: "",
        filterGroup: "",
        sortOrder: entries.length * 10,
        filterGroupBgColor: "",
        filterGroupTextColor: "",
        tileBgColor: "",
        tileTextColor: "",
        tileColor: "",
        showOnShopFloor: true,
      },
    ]);
    setDrafts((p) => ({ ...p, [selectedKey]: "" }));
    toast.success("Value added.");
  };

  const removeValue = async (value) => {
    if (isFixedValues) return;
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
    if (isFixedValues) return;
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
    const next = lines.map((value, lineIdx) => {
      const prev = prevByLower.get(value.toLowerCase());
      return {
        value: value.slice(0, 80),
        label: prev?.label ?? "",
        filterGroup: prev?.filterGroup ?? "",
        sortOrder:
          prev?.sortOrder != null && Number.isFinite(Number(prev.sortOrder))
            ? Math.trunc(Number(prev.sortOrder))
            : lineIdx * 10,
        filterGroupBgColor: prev?.filterGroupBgColor ?? "",
        filterGroupTextColor: prev?.filterGroupTextColor ?? "",
        tileBgColor: prev?.tileBgColor ?? "",
        tileTextColor: prev?.tileTextColor ?? "",
        tileColor: prev?.tileColor || "",
        showOnShopFloor: prev?.showOnShopFloor !== false,
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
        <FormSectionTitle as="h2">Status</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Define status option lists for quotes, work orders, and invoices. Purchase payment statuses (Paid / Unpaid /
          Partial Paid) are fixed for the Purchase / Payable filter cards — you can change their display labels and tile
          colors only. Add values below for other lists, delete with the trash icon or × on each chip, reorder rows, set
          display labels, and pick tile background and text colors for badges and summary cards. Save settings when
          finished.
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
            Total values: {entries.length}.
            {isFixedValues ? (
              <>
                {" "}
                These values are <span className="font-medium text-title">fixed</span> (Paid, Unpaid, Partial Paid) for
                Purchase / Payable filter summary cards. Change display labels and tile colors only — they cannot be
                added or removed.
              </>
            ) : null}
            {showShopFloorColumn ? (
              <>
                {" "}
                Use <span className="font-medium text-title">Shop floor</span> to show or hide each status as a column on
                the shop floor job board (work orders in hidden statuses are not listed there).
              </>
            ) : null}
            {showQuoteFilterGroupColumns ? (
              <>
                {" "}
                Statuses that share the same <span className="font-medium text-title">Filter Group</span> appear as one
                summary filter card on Service Proposals.{" "}
                <span className="font-medium text-title">Filter Group colors</span> style those cards (shared across
                statuses in the group; if unset, the lowest-Sort member&apos;s tile colors are used).{" "}
                <span className="font-medium text-title">Sort</span> controls status column order in the table.
              </>
            ) : null}{" "}
            {!isFixedValues ? (
              <>
                Quote statuses are stored on each RFQ; keep an{" "}
                <span className="font-medium text-title">approved</span>-labeled option if you use{" "}
                <span className="font-medium text-title">Create work order</span> from Quotes (API checks that slug). For
                invoices, keep slugs like <span className="font-medium text-title">sent</span>,{" "}
                <span className="font-medium text-title">partial_paid</span>, and{" "}
                <span className="font-medium text-title">fully_paid</span> if you use email send and payment recording.
              </>
            ) : null}
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {entries.map((row, chipIdx) => {
              const chipTile = resolveStatusTileProps(row.tileColor, chipIdx, row);
              return (
              <span
                key={row.value}
                className={`job-board-status-pill inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm ${chipTile.className}`}
                style={chipTile.style}
              >
                {chipLabel(row)}
                {!isFixedValues ? (
                  <button
                    type="button"
                    onClick={() => removeValue(row.value)}
                    className="rounded p-0.5 text-secondary hover:bg-card hover:text-danger"
                    aria-label={`Delete ${chipLabel(row)}`}
                    title={`Delete ${chipLabel(row)}`}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
            })}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className={`w-full text-sm ${showQuoteFilterGroupColumns ? "min-w-[62rem]" : "min-w-[36rem]"}`}>
              <thead className="border-b border-border bg-form-bg/80 text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                <tr>
                  {!isFixedValues ? <th className="w-24 px-3 py-2">Order</th> : null}
                  <th className="px-3 py-2">Value</th>
                  {showEntryLabels ? <th className="px-3 py-2">Display label</th> : null}
                  {showQuoteFilterGroupColumns ? (
                    <>
                      <th className="min-w-[8rem] px-3 py-2">Filter Group</th>
                      <th className="w-24 px-3 py-2">Sort</th>
                      <th className="min-w-[14rem] px-3 py-2">Filter Group colors</th>
                    </>
                  ) : null}
                  {showShopFloorColumn ? (
                    <th className="px-3 py-2 text-center">Shop floor</th>
                  ) : null}
                  <th className="min-w-[14rem] px-3 py-2">Tile colors</th>
                  <th className="px-3 py-2 text-right">Preview</th>
                  {!isFixedValues ? <th className="w-12 px-3 py-2" aria-label="Delete" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((row, idx) => (
                  <tr key={row.value}>
                    {!isFixedValues ? (
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
                    ) : null}
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
                    {showQuoteFilterGroupColumns ? (
                      <>
                        <td className="px-3 py-2">
                          <Input
                            value={row.filterGroup ?? ""}
                            onChange={(e) => {
                              const nextName = e.target.value ?? "";
                              const nextKey = filterGroupKey(nextName || row.label || row.value);
                              const peer =
                                nextKey &&
                                entries.find(
                                  (e2, i2) =>
                                    i2 !== idx &&
                                    filterGroupKey(e2.filterGroup || e2.label || e2.value) === nextKey &&
                                    (e2.filterGroupBgColor || e2.filterGroupTextColor)
                                );
                              const next = [...entries];
                              next[idx] = {
                                ...next[idx],
                                filterGroup: nextName,
                                ...(peer
                                  ? {
                                      filterGroupBgColor: peer.filterGroupBgColor ?? "",
                                      filterGroupTextColor: peer.filterGroupTextColor ?? "",
                                    }
                                  : {}),
                              };
                              patchEntries(next);
                            }}
                            className="!gap-0"
                            placeholder={row.label || row.value}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={row.sortOrder ?? idx * 10}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = Number(raw);
                              const next = [...entries];
                              next[idx] = {
                                ...next[idx],
                                sortOrder: Number.isFinite(n) ? Math.trunc(n) : idx * 10,
                              };
                              patchEntries(next);
                            }}
                            className="!gap-0"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TileColorPicker
                            bgColor={row.filterGroupBgColor ?? ""}
                            textColor={row.filterGroupTextColor ?? ""}
                            onChange={({ tileBgColor, tileTextColor }) => {
                              const gk = filterGroupKey(row.filterGroup || row.label || row.value);
                              const next = entries.map((e, i) => {
                                const sameGroup =
                                  i === idx ||
                                  (gk &&
                                    filterGroupKey(e.filterGroup || e.label || e.value) === gk);
                                if (!sameGroup) return e;
                                return {
                                  ...e,
                                  filterGroupBgColor: tileBgColor ?? "",
                                  filterGroupTextColor: tileTextColor ?? "",
                                };
                              });
                              patchEntries(next);
                            }}
                          />
                        </td>
                      </>
                    ) : null}
                    {showShopFloorColumn ? (
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={row.showOnShopFloor !== false}
                          onChange={(e) => {
                            const next = [...entries];
                            next[idx] = { ...next[idx], showOnShopFloor: e.target.checked };
                            patchEntries(next);
                          }}
                          className="inline-flex justify-center"
                          aria-label={`Show ${row.value} on shop floor job board`}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2 align-top">
                      <TileColorPicker
                        bgColor={row.tileBgColor ?? ""}
                        textColor={row.tileTextColor ?? ""}
                        onChange={({ tileBgColor, tileTextColor, tileColor }) => {
                          const next = [...entries];
                          next[idx] = {
                            ...next[idx],
                            tileBgColor: tileBgColor ?? "",
                            tileTextColor: tileTextColor ?? "",
                            tileColor: tileColor ?? "",
                          };
                          patchEntries(next);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {(() => {
                        const preview = resolveStatusTileProps(row.tileColor, idx, row);
                        return (
                      <span
                        className={`job-board-status-pill inline-flex max-w-[10rem] truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ${preview.className}`}
                        style={preview.style}
                      >
                        {chipLabel(row)}
                      </span>
                        );
                      })()}
                    </td>
                    {!isFixedValues ? (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeValue(row.value)}
                          disabled={entries.length <= 1}
                          className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Delete ${chipLabel(row)}`}
                          title={entries.length <= 1 ? "Keep at least one value" : `Delete ${chipLabel(row)}`}
                        >
                          <FiX className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isFixedValues ? (
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
          ) : null}
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
          <Button type="button" variant="primary" disabled={bulkSaving} onClick={saveBulk}>
            {bulkSaving ? "Saving…" : "Save values"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
