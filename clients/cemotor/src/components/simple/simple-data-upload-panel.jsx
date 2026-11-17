"use client";

import { useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { Form, FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { FiDownload, FiUpload, FiFilePlus, FiTrash2 } from "react-icons/fi";

/** Flat parent→child order for Simple import collections. */
const IMPORT_COLLECTIONS = [
  { collection: "customers", label: "Customers" },
  { collection: "vendors", label: "Vendors" },
  { collection: "inventoryItems", label: "Inventory Items" },
  { collection: "employees", label: "Employees" },
  { collection: "salesPersons", label: "Sales Persons" },
  { collection: "simpleServiceProposals", label: "Service Proposals" },
  {
    collection: "simpleServiceProposalScopeDetails",
    label: "Scope Details",
    childOf: "Service Proposals",
    hint: "One row per scope line. Import Service Proposals first. Link with service_proposal_external_ref.",
  },
  {
    collection: "simpleServiceProposalOtherItems",
    label: "Other Items",
    childOf: "Service Proposals",
    hint: "One row per parts/other line. Import Service Proposals first. Optional inventory_item_external_ref.",
  },
  {
    collection: "simpleServiceProposalAcDatasheets",
    label: "AC Datasheet",
    childOf: "Service Proposals",
    hint: "One row per proposal AC datasheet. Import Service Proposals first. Columns use ds_* for DataSheet fields; optional disassembly_json / assembly_json.",
  },
  {
    collection: "simpleServiceProposalDcDatasheets",
    label: "DC Datasheet",
    childOf: "Service Proposals",
    hint: "One row per proposal DC datasheet. Import Service Proposals first. Columns use ff_* (Field Frame) and arm_* (Armature).",
  },
  { collection: "simplePurchaseOrders", label: "Purchase Orders" },
  {
    collection: "simplePurchaseOrderLineItems",
    label: "PO Line Items",
    childOf: "Purchase Orders",
    hint: "One row per PO line. Import Purchase Orders first. Link with purchase_order_external_ref. Optional inventory_item_external_ref.",
  },
];

export default function SimpleDataUploadPanel() {
  const alert = useAlert();
  const confirm = useConfirm();
  const rows = useMemo(() => IMPORT_COLLECTIONS, []);
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
  const [downloading, setDownloading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function ensureCollectionsLoaded() {
    if (loadedCollections) return allowedCollections;
    try {
      const res = await fetch("/api/dashboard/simple-import/template", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json?.collections) ? json.collections.map((x) => String(x.value)) : [];
      const next = new Set(list);
      setAllowedCollections(next);
      setLoadedCollections(true);
      return next;
    } catch {
      await alert({
        title: "Error",
        message: "Could not load import collections list.",
        variant: "danger",
      });
      return new Set();
    }
  }

  async function downloadTemplate(collection) {
    await ensureCollectionsLoaded();
    try {
      const res = await fetch(
        `/api/dashboard/simple-import/template?collection=${encodeURIComponent(collection)}`,
        { method: "GET", cache: "no-store" },
      );
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
      await alert({
        title: "Error",
        message: err.message || "Template download failed",
        variant: "danger",
      });
    }
  }

  async function importFile(collection) {
    await ensureCollectionsLoaded();
    const file = files[collection];
    if (!file) {
      await alert({
        title: "Missing file",
        message: "Please choose a CSV file first.",
        variant: "danger",
      });
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
      const res = await fetch("/api/dashboard/simple-import/run", {
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
        await alert({
          title: "Import completed with errors",
          message: "Invalid records are not imported. Please fix in the CSV and re-upload.",
          variant: "danger",
        });
      } else {
        await alert({
          title: "Import complete",
          message: `${json.importedRows ?? 0} rows imported for ${rowMeta?.label || collection}.`,
        });
      }
    } catch (err) {
      setUploadModal((prev) => ({ ...prev, running: false }));
      await alert({
        title: "Error",
        message: err.message || "Import failed",
        variant: "danger",
      });
    } finally {
      clearInterval(tick);
      setTimeout(() => setBusyByCollection((p) => ({ ...p, [collection]: false })), 150);
    }
  }

  function closePasswordModal() {
    if (clearingAll) return;
    setPasswordOpen(false);
    setAdminPassword("");
    setPasswordError("");
  }

  async function downloadYourData() {
    if (downloading || clearingAll || uploadModal.running) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/dashboard/simple-import/export", { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Download failed");
      }
      const blob = await res.blob();
      const match = /filename="([^"]+)"/i.exec(res.headers.get("Content-Disposition") || "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] || "your-data.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Download failed",
        variant: "danger",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function clearAllCollections() {
    if (uploadModal.running || clearingAll || passwordOpen) return;
    const first = await confirm({
      title: "Clear all tables?",
      message:
        "This will permanently delete your shop data: customers, vendors, inventory, employees, sales persons, jobs, invoices, and purchase orders. Do you want to continue?",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Please confirm again",
      message: "Delete all tables now? This action cannot be undone.",
      confirmLabel: "Delete all",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!second) return;
    setAdminPassword("");
    setPasswordError("");
    setPasswordOpen(true);
  }

  async function submitClearAll(event) {
    event.preventDefault();
    if (clearingAll) return;
    const password = adminPassword;
    if (!password) {
      setPasswordError("Enter the admin login password.");
      return;
    }
    setClearingAll(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/dashboard/simple-import/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "CLEAR_ALL_SIMPLE_IMPORT_DATA", password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 400 || res.status === 429) {
          setPasswordError(json?.error || "Incorrect admin password.");
          return;
        }
        throw new Error(json?.error || "Failed to clear tables.");
      }

      setFiles({});
      setStatsByCollection({});
      setPasswordOpen(false);
      setAdminPassword("");
      await alert({
        title: "Cleared",
        message: `Cleared tables successfully (${json?.deletedCount || 0} deleted).`,
      });
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to clear tables.",
        variant: "danger",
      });
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
      const res = await fetch("/api/dashboard/simple-import/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmPhrase: "CLEAR_ALL_SIMPLE_IMPORT_DATA",
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
      await alert({
        title: "Deleted",
        message: `Deleted ${label} data (${json?.deletedCount || 0} affected).`,
      });
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || `Failed to clear ${label}.`,
        variant: "danger",
      });
    } finally {
      setClearingByCollection((p) => ({ ...p, [collection]: false }));
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <FormContainer>
        <FormSectionTitle as="h2">Your Data</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Download every table as one Excel file, or import data collection by collection. Download each template
          (columns match that collection&apos;s form), fill it, and upload. Only valid rows import. Invalid rows are
          exported with error reasons. Recommended sequence: Customers, Vendors, Inventory / Employees / Sales
          Persons, Service Proposals, Scope Details, Other Items, AC/DC Datasheets, Purchase Orders.
        </p>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-form-bg/70 p-3">
          <p className="text-xs text-secondary">
            Download your tables, or clear all tables after entering the admin login password.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={downloadYourData}
              disabled={downloading || clearingAll || uploadModal.running}
            >
              <FiDownload className="h-4 w-4 shrink-0" />
              {downloading ? "Preparing..." : "Download Your Data"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={clearAllCollections}
              disabled={clearingAll || uploadModal.running || downloading}
            >
              <FiTrash2 className="h-4 w-4 shrink-0" />
              {clearingAll ? "Clearing..." : "Clear all tables"}
            </Button>
          </div>
        </div>
        <div className="mb-4 rounded-md border border-border bg-form-bg/70 p-3 text-xs text-secondary">
          Recommended sequence: Customers → Vendors → Inventory / Employees / Sales Persons → Service Proposals →
          Scope Details → Other Items → AC Datasheet → DC Datasheet → Purchase Orders → PO Line Items.
        </div>
        <div className="mb-4 rounded-md border border-border bg-form-bg/70 p-3 text-xs text-secondary">
          Date columns must use <span className="font-medium text-title">YYYY-MM-DD</span> (example:{" "}
          <span className="font-medium text-title">2026-08-01</span>). Templates already use this format. Avoid
          locale slash dates like 08/01/2026.
        </div>
        <p className="mb-4 text-xs text-secondary">
          Use the <FiFilePlus className="mx-1 inline h-3.5 w-3.5 align-text-bottom" /> icon to choose a CSV file, then{" "}
          <FiUpload className="mx-1 inline h-3.5 w-3.5 align-text-bottom" /> to import.
        </p>
        <div className="space-y-4">
          {rows.map((row) => {
            const busy = !!busyByCollection[row.collection];
            const clearingOne = !!clearingByCollection[row.collection];
            const stats = statsByCollection[row.collection];
            const file = files[row.collection] || null;
            return (
              <div
                key={row.collection}
                className={`rounded-lg border border-border bg-bg p-4 shadow-sm ${
                  row.childOf ? "ml-4 border-l-4 border-l-primary/40 sm:ml-8" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-title">
                      {row.childOf ? (
                        <span className="text-secondary">
                          {row.childOf}
                          <span className="mx-1.5 text-border">/</span>
                        </span>
                      ) : null}
                      {row.label}
                    </p>
                    {row.hint ? <p className="mt-0.5 text-xs text-secondary">{row.hint}</p> : null}
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
        open={passwordOpen}
        onClose={closePasswordModal}
        title="Clear all tables"
        size="md"
        showClose={!clearingAll}
        actions={
          <Button
            type="submit"
            form="clear-tables-password"
            size="sm"
            variant="danger"
            disabled={clearingAll || !adminPassword}
          >
            {clearingAll ? "Deleting..." : "Delete all"}
          </Button>
        }
      >
        <Form id="clear-tables-password" onSubmit={submitClearAll} className="border-0 bg-transparent p-0 shadow-none">
          <p className="text-sm text-secondary">
            Enter the admin login password to delete your shop data tables. This cannot be undone.
          </p>
          <Input
            label="Admin password"
            type="password"
            name="adminPassword"
            autoComplete="current-password"
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            required
          />
          {passwordError ? <p className="text-sm text-danger">{passwordError}</p> : null}
        </Form>
      </Modal>
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
