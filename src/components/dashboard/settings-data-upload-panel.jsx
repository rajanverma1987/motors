"use client";

import { useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { FiDownload, FiUpload, FiFilePlus, FiTrash2 } from "react-icons/fi";

const IMPORT_TREE = [
  {
    collection: "customers",
    label: "Customers",
    children: [
      { collection: "customerAdditionalContacts", label: "Additional Contacts", children: [] },
      {
        collection: "motors",
        label: "Motors",
        children: [
          {
            collection: "quotes",
            label: "RFQs",
            children: [
              { collection: "quoteScopeLines", label: "RFQ Scope Lines (labor)", children: [] },
              { collection: "quotePartLines", label: "RFQ Other Cost Lines", children: [] },
              { collection: "workOrders", label: "Work Orders", children: [] },
              { collection: "invoices", label: "Invoices", children: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    collection: "vendors",
    label: "Vendors",
    children: [{ collection: "purchaseOrders", label: "Purchase Orders", children: [] }],
  },
  { collection: "employees", label: "Employees", children: [] },
  { collection: "salesPersons", label: "Sales Persons", children: [] },
  { collection: "salesCommissions", label: "Sales commission", children: [] },
  { collection: "inventoryItems", label: "Inventory Items", children: [] },
  {
    collection: "repairFlowJobs",
    label: "Repair Flow Jobs",
    children: [
      { collection: "repairFlowQuotes", label: "Repair Flow Quotes", children: [] },
      { collection: "repairFlowInspections", label: "Repair Flow Inspections", children: [] },
    ],
  },
];

function flattenTree(nodes, level = 0, parentCollection = "") {
  const out = [];
  for (const n of nodes) {
    out.push({
      collection: n.collection,
      label: n.label,
      level,
      parentCollection,
      hasChildren: Array.isArray(n.children) && n.children.length > 0,
    });
    if (n.children?.length) {
      out.push(...flattenTree(n.children, level + 1, n.collection));
    }
  }
  return out;
}

export default function SettingsDataUploadPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const rows = useMemo(() => flattenTree(IMPORT_TREE), []);
  const [files, setFiles] = useState({});
  const [busyByCollection, setBusyByCollection] = useState({});
  const [statsByCollection, setStatsByCollection] = useState({});
  const [allowedCollections, setAllowedCollections] = useState(new Set());
  const [loadedCollections, setLoadedCollections] = useState(false);
  const fileInputRefs = useRef({});
  const [uploadModal, setUploadModal] = useState({
    open: false,
    collection: "",
    label: "",
    progress: 0,
    running: false,
  });
  const [clearingAll, setClearingAll] = useState(false);
  const [clearingByCollection, setClearingByCollection] = useState({});

  async function ensureCollectionsLoaded() {
    if (loadedCollections) return allowedCollections;
    try {
      const res = await fetch("/api/dashboard/import/template", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json?.collections) ? json.collections.map((x) => String(x.value)) : [];
      const next = new Set(list);
      setAllowedCollections(next);
      setLoadedCollections(true);
      return next;
    } catch {
      toast.error("Could not load import collections list.");
      return new Set();
    }
  }

  async function downloadTemplate(collection) {
    await ensureCollectionsLoaded();
    try {
      const res = await fetch(`/api/dashboard/import/template?collection=${encodeURIComponent(collection)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Template download failed");
      }
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Template download failed");
    }
  }

  async function importFile(collection) {
    await ensureCollectionsLoaded();
    const file = files[collection];
    if (!file) {
      toast.error("Please choose a CSV file first.");
      return;
    }
    const rowMeta = rows.find((r) => r.collection === collection);
    setBusyByCollection((p) => ({ ...p, [collection]: true }));
    setUploadModal({
      open: true,
      collection,
      label: rowMeta?.label || collection,
      progress: 5,
      running: true,
    });
    const tick = setInterval(() => {
      setUploadModal((prev) =>
        prev.running ? { ...prev, progress: Math.min(90, (prev.progress || 0) + 8) } : prev,
      );
    }, 250);
    try {
      const csvText = await file.text();
      const res = await fetch("/api/dashboard/import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, csvText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Import failed");

      setUploadModal((prev) => ({ ...prev, progress: 100, running: false }));
      setStatsByCollection((p) => ({
        ...p,
        [collection]: {
          totalRows: json.totalRows ?? 0,
          importedRows: json.importedRows ?? 0,
          invalidRows: json.invalidRows ?? 0,
        },
      }));
      if (json?.invalidCsv) {
        const blob = new Blob([json.invalidCsv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${collection}-invalid-records.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.error("Invalid records are not imported. Please fix in the CSV and re-upload.");
      } else {
        toast.success(`${json.importedRows ?? 0} rows imported for ${collection}.`);
      }
    } catch (err) {
      setUploadModal((prev) => ({ ...prev, running: false }));
      toast.error(err.message || "Import failed");
    } finally {
      clearInterval(tick);
      setTimeout(() => setBusyByCollection((p) => ({ ...p, [collection]: false })), 150);
    }
  }

  async function clearAllCollections() {
    if (uploadModal.running || clearingAll) return;
    const first = await confirm({
      title: "Clear all collections?",
      message:
        "This will permanently delete ALL records from Data Upload collections for your account. Do you want to continue?",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Please confirm again",
      message: "Delete ALL records now? This action cannot be undone.",
      confirmLabel: "Delete all",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!second) return;

    setClearingAll(true);
    try {
      const res = await fetch("/api/dashboard/import/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "CLEAR_ALL_IMPORT_DATA" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to clear collections.");

      setFiles({});
      setStatsByCollection({});
      toast.success(`Cleared records successfully (${json?.deletedCount || 0} deleted).`);
    } catch (err) {
      toast.error(err.message || "Failed to clear collections.");
    } finally {
      setClearingAll(false);
    }
  }

  async function clearCollection(row) {
    const collection = row?.collection;
    const label = row?.label || collection;
    if (!collection || uploadModal.running || clearingAll || clearingByCollection[collection]) return;
    const first = await confirm({
      title: `Delete ${label} data?`,
      message: `This will permanently delete all imported data for "${label}". Do you want to continue?`,
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Please confirm again",
      message: `Delete all "${label}" records now? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!second) return;

    setClearingByCollection((p) => ({ ...p, [collection]: true }));
    try {
      const res = await fetch("/api/dashboard/import/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmPhrase: "CLEAR_ALL_IMPORT_DATA",
          collection,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to clear ${label}.`);
      setFiles((p) => ({ ...p, [collection]: null }));
      setStatsByCollection((p) => {
        const next = { ...p };
        delete next[collection];
        return next;
      });
      toast.success(`Deleted ${label} data (${json?.deletedCount || 0} affected).`);
    } catch (err) {
      toast.error(err.message || `Failed to clear ${label}.`);
    } finally {
      setClearingByCollection((p) => ({ ...p, [collection]: false }));
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <FormContainer>
        <FormSectionTitle as="h2">Data Upload</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Import data collection-by-collection in parent-child order. Download the template, fill it, upload CSV, and
          only valid records will be imported. Invalid rows are exported immediately with error reasons. RFQ templates
          match the RFQ page: write-up status, tax fields, scope lines (labor), other-cost lines, then work orders or
          invoices linked by <span className="font-medium text-title">quote_external_ref</span>.
        </p>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-form-bg/70 p-3">
          <p className="text-xs text-secondary">Use this only when you need to reset all uploaded collection data.</p>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={clearAllCollections}
            disabled={clearingAll || uploadModal.running}
          >
            <FiTrash2 className="h-4 w-4 shrink-0" />
            {clearingAll ? "Clearing..." : "Clear all collections"}
          </Button>
        </div>
        <div className="mb-4 rounded-md border border-border bg-form-bg/70 p-3 text-xs text-secondary">
          Recommended sequence: parent records first (for example Customers), then child records (Motors, RFQs, scope /
          other-cost line items, then work orders or invoices).
        </div>
        <p className="mb-4 text-xs text-secondary">
          Use the <FiFilePlus className="mx-1 inline h-3.5 w-3.5 align-text-bottom" /> icon to choose a CSV file, then{" "}
          <FiUpload className="mx-1 inline h-3.5 w-3.5 align-text-bottom" /> to import.
        </p>
        <div className="space-y-4">
          {rows.map((row) => {
            const levelPad = row.level * 18;
            const busy = !!busyByCollection[row.collection];
            const clearingOne = !!clearingByCollection[row.collection];
            const stats = statsByCollection[row.collection];
            const file = files[row.collection] || null;
            return (
              <div
                key={row.collection}
                className="rounded-lg border border-border bg-bg p-4 shadow-sm"
                style={{ marginLeft: `${levelPad}px` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-title">
                      {row.label}
                      {row.hasChildren ? <span className="ml-2 text-xs text-secondary">(parent)</span> : null}
                    </p>
                    <p className="text-xs text-secondary">Collection key: {row.collection}</p>
                    {file ? <p className="mt-1 text-xs text-secondary">Selected file: {file.name}</p> : null}
                    {stats ? (
                      <p className="mt-2 inline-flex rounded-full border border-border bg-form-bg px-2 py-0.5 text-xs text-secondary">
                        Total: {stats.totalRows} | Imported: {stats.importedRows} | Invalid: {stats.invalidRows}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Download template for ${row.label}`}
                      title="Download template"
                      onClick={() => downloadTemplate(row.collection)}
                      disabled={busy || clearingOne || clearingAll}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiDownload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Choose CSV file for ${row.label}`}
                      title="Choose CSV file"
                      onClick={() => fileInputRefs.current[row.collection]?.click()}
                      disabled={busy || clearingOne || clearingAll}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-secondary hover:bg-card hover:text-title disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiFilePlus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Upload CSV for ${row.label}`}
                      title={busy ? "Importing..." : "Upload CSV"}
                      onClick={() => importFile(row.collection)}
                      disabled={busy || clearingOne || clearingAll || !file}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiUpload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${row.label} data`}
                      title={clearingOne ? "Deleting..." : "Delete data"}
                      onClick={() => clearCollection(row)}
                      disabled={busy || clearingOne || clearingAll || uploadModal.running}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-danger/40 text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    ref={(el) => {
                      fileInputRefs.current[row.collection] = el;
                    }}
                    type="file"
                    accept=".csv,text/csv"
                    name={`csv-${row.collection}`}
                    onChange={(e) => {
                      const chosen = e.target.files?.[0] || null;
                      setFiles((p) => ({ ...p, [row.collection]: chosen }));
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </FormContainer>
      <Modal
        open={uploadModal.open}
        onClose={() => {
          if (uploadModal.running) return;
          setUploadModal({ open: false, collection: "", label: "", progress: 0, running: false });
        }}
        title="Uploading CSV"
        size="md"
        showClose={!uploadModal.running}
      >
        <div className="space-y-3">
          <p className="text-sm text-secondary">
            Importing <span className="font-medium text-title">{uploadModal.label || uploadModal.collection}</span>.
            Please wait while we validate and import valid rows.
          </p>
          <div className="w-full">
            <div className="mb-1 flex items-center justify-between text-xs text-secondary">
              <span>Progress</span>
              <span>{uploadModal.progress}%</span>
            </div>
            <div className="h-2.5 w-full rounded bg-card">
              <div
                className="h-2.5 rounded bg-primary transition-all"
                style={{ width: `${Math.max(0, Math.min(100, uploadModal.progress))}%` }}
              />
            </div>
          </div>
          {!uploadModal.running ? (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setUploadModal({ open: false, collection: "", label: "", progress: 0, running: false })
                }
              >
                Close
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

