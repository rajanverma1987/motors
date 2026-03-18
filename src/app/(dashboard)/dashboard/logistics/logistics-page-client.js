"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

const TABS = [
  {
    id: "motor_receiving",
    label: "Motor receiving",
    sub: "Inbound for repair",
    kind: "motor_receiving",
  },
  {
    id: "motor_shipping",
    label: "Motor shipping",
    sub: "Outbound / return after repair",
    kind: "motor_shipping",
  },
  {
    id: "vendor_po_receiving",
    label: "Vendor PO receiving",
    sub: "Parts & materials from PO",
    kind: "vendor_po_receiving",
  },
];

const TRANSPORT_OPTIONS = [
  { value: "", label: "Select manner of transport" },
  { value: "Customer drop-off", label: "Customer drop-off" },
  { value: "UPS", label: "UPS" },
  { value: "FedEx", label: "FedEx" },
  { value: "Freight line / LTL", label: "Freight line / LTL" },
  { value: "Courier", label: "Courier" },
  { value: "Shop pickup", label: "Shop pickup" },
  { value: "Internal / dock", label: "Internal / dock" },
  { value: "Other", label: "Other" },
];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  date: todayISODate(),
  invoiceNumber: "",
  jobNumber: "",
  purchaseOrderId: "",
  mannerOfTransport: "",
  freight: "",
  droppedBy: "",
  pickedBy: "",
  charges: "",
  notes: "",
};

const MANUAL_OPTION = "__manual__";

export default function LogisticsPageClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const fmt = useFormatMoney();

  const [tab, setTab] = useState("motor_receiving");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  /** @type {Array<{ workOrderNumber?: string; quoteRfqNumber?: string; customerCompany?: string }>} */
  const [workOrders, setWorkOrders] = useState([]);
  /** @type {Array<{ invoiceNumber?: string; customerName?: string; date?: string }>} */
  const [invoices, setInvoices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  /** @type {{ lineItems: Array<{ description?: string; qty?: string; uom?: string; unitPrice?: string; status?: string }> } | null} */
  const [selectedPoDetail, setSelectedPoDetail] = useState(null);
  const [poDetailLoading, setPoDetailLoading] = useState(false);
  /** Per-line: "Received" | "Back Order" (aligned with selectedPoDetail.lineItems) */
  const [poLineReceipts, setPoLineReceipts] = useState([]);

  const activeKind = TABS.find((t) => t.id === tab)?.kind || "motor_receiving";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const secondaryUrl =
        activeKind === "vendor_po_receiving"
          ? "/api/dashboard/purchase-orders"
          : activeKind === "motor_receiving"
            ? "/api/dashboard/work-orders"
            : activeKind === "motor_shipping"
              ? "/api/dashboard/invoices"
              : null;
      const [logRes, secondaryRes] = await Promise.all([
        fetch(`/api/dashboard/logistics?kind=${encodeURIComponent(activeKind)}`, {
          credentials: "include",
          cache: "no-store",
        }),
        secondaryUrl
          ? fetch(secondaryUrl, { credentials: "include", cache: "no-store" })
          : Promise.resolve(null),
      ]);
      const logData = await logRes.json();
      if (!logRes.ok) throw new Error(logData.error || "Failed to load");
      setRows(Array.isArray(logData) ? logData : []);
      if (secondaryRes) {
        const secData = await secondaryRes.json();
        if (activeKind === "vendor_po_receiving") {
          setPurchaseOrders(Array.isArray(secData) ? secData : []);
        } else if (activeKind === "motor_receiving") {
          setWorkOrders(Array.isArray(secData) ? secData : []);
        } else if (activeKind === "motor_shipping") {
          setInvoices(Array.isArray(secData) ? secData : []);
        }
      }
    } catch (e) {
      toast.error(e.message || "Could not load logistics");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeKind, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen || activeKind !== "vendor_po_receiving" || !form.purchaseOrderId?.trim()) {
      setSelectedPoDetail(null);
      setPoLineReceipts([]);
      setPoDetailLoading(false);
      return;
    }
    let cancelled = false;
    setPoDetailLoading(true);
    setSelectedPoDetail(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${form.purchaseOrderId.trim()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const d = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setSelectedPoDetail(null);
          setPoLineReceipts([]);
          toast.error(d.error || "Could not load PO");
        } else {
          setSelectedPoDetail(d);
          const lines = Array.isArray(d.lineItems) ? d.lineItems : [];
          setPoLineReceipts(
            lines.map((li) =>
              li.status === "Received" ? "Received" : li.status === "Back Order" ? "Back Order" : "Back Order"
            )
          );
        }
      } catch {
        if (!cancelled) {
          setSelectedPoDetail(null);
          setPoLineReceipts([]);
          toast.error("Could not load PO");
        }
      } finally {
        if (!cancelled) setPoDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, activeKind, form.purchaseOrderId, toast]);

  const poOptions = useMemo(
    () => [
      { value: "", label: "PO (optional)" },
      ...purchaseOrders.map((p) => ({
        value: p.id,
        label: `${p.poNumber || p.id} — ${p.vendorName || p.vendorId || "Vendor"}`,
      })),
    ],
    [purchaseOrders]
  );

  const refDropdownOptions = useMemo(() => {
    const opts = [
      { value: "", label: "Select REF# …" },
      ...workOrders.map((w) => {
        const ref = (w.quoteRfqNumber || "").trim() || "—";
        const co = (w.customerCompany || "").trim();
        return {
          value: w.workOrderNumber || "",
          label: `REF# ${ref} · ${w.workOrderNumber || "—"}${co ? ` · ${co}` : ""}`,
        };
      }).filter((o) => o.value),
      { value: MANUAL_OPTION, label: "Other (type REF# / job #)" },
    ];
    return opts;
  }, [workOrders]);

  const invoiceDropdownOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const inv of invoices) {
      const num = (inv.invoiceNumber || "").trim();
      if (!num || seen.has(num)) continue;
      seen.add(num);
      const cust = (inv.customerName || "").trim();
      const dt = (inv.date || "").trim();
      list.push({
        value: num,
        label: `${num}${cust ? ` · ${cust}` : ""}${dt ? ` · ${dt}` : ""}`,
      });
    }
    return [
      { value: "", label: "Select invoice # …" },
      ...list,
      { value: MANUAL_OPTION, label: "Other (type invoice #)" },
    ];
  }, [invoices]);

  const refSelectValue = useMemo(() => {
    const j = (form.jobNumber || "").trim();
    if (!j) return "";
    if (workOrders.some((w) => (w.workOrderNumber || "").trim() === j)) return j;
    return MANUAL_OPTION;
  }, [form.jobNumber, workOrders]);

  const invoiceSelectValue = useMemo(() => {
    const inv = (form.invoiceNumber || "").trim();
    if (!inv) return "";
    if (invoices.some((i) => (i.invoiceNumber || "").trim() === inv)) return inv;
    return MANUAL_OPTION;
  }, [form.invoiceNumber, invoices]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayISODate() });
    setSelectedPoDetail(null);
    setPoLineReceipts([]);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      date: row.date || todayISODate(),
      invoiceNumber: row.invoiceNumber || "",
      jobNumber: row.jobNumber || "",
      purchaseOrderId: row.purchaseOrderId || "",
      mannerOfTransport: row.mannerOfTransport || "",
      freight: row.freight || "",
      droppedBy: row.droppedBy || "",
      pickedBy: row.pickedBy || "",
      charges: row.charges || "",
      notes: row.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setSelectedPoDetail(null);
    setPoLineReceipts([]);
    setPoDetailLoading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.date?.trim()) {
      toast.error("Date is required.");
      return;
    }
    const poLineCount = selectedPoDetail?.lineItems?.length ?? 0;
    if (activeKind === "vendor_po_receiving" && form.purchaseOrderId?.trim() && poLineCount > 0) {
      if (poDetailLoading) {
        toast.error("Wait for PO lines to load.");
        return;
      }
      if (poLineReceipts.length !== poLineCount) {
        toast.error("Mark each PO line as Received or Back Order.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        kind: activeKind,
        date: form.date.trim(),
        invoiceNumber: form.invoiceNumber.trim(),
        jobNumber: form.jobNumber.trim(),
        mannerOfTransport: form.mannerOfTransport.trim(),
        freight: form.freight.trim(),
        droppedBy: form.droppedBy.trim(),
        pickedBy: form.pickedBy.trim(),
        charges: form.charges.trim(),
        notes: form.notes.trim(),
      };
      if (activeKind === "vendor_po_receiving" && form.purchaseOrderId) {
        payload.purchaseOrderId = form.purchaseOrderId;
        if (poLineCount > 0) {
          payload.poLineReceiptStatuses = poLineReceipts;
        }
      }

      if (editingId) {
        const res = await fetch(`/api/dashboard/logistics/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Update failed");
        toast.success("Entry updated.");
      } else {
        const res = await fetch("/api/dashboard/logistics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Save failed");
        toast.success("Logistics entry saved.");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: "Delete entry?",
      message: "This logistics record will be removed.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/logistics/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Delete failed");
      toast.success("Deleted.");
      load();
    } catch (e) {
      toast.error(e.message || "Could not delete");
    }
  };

  const chargesDisplay = (v) => {
    const n = parseFloat(String(v).replace(/,/g, ""));
    if (Number.isFinite(n) && n !== 0) return fmt(n);
    return v || "—";
  };

  const columns = useMemo(() => {
    if (activeKind === "motor_receiving") {
      return [
        {
          key: "actions",
          label: "",
          render: (_, row) => (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded p-1.5 text-primary hover:bg-primary/10"
                aria-label="Edit"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row)}
                className="rounded p-1.5 text-danger hover:bg-danger/10"
                aria-label="Delete"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          ),
        },
        { key: "date", label: "Date" },
        { key: "jobNumber", label: "REF# / Job" },
        { key: "mannerOfTransport", label: "Transport" },
        { key: "freight", label: "Freight" },
        { key: "droppedBy", label: "Dropped by" },
        {
          key: "charges",
          label: "Charges",
          render: (v) => <span className="tabular-nums">{chargesDisplay(v)}</span>,
        },
        {
          key: "notes",
          label: "Notes",
          render: (v) => (
            <span className="line-clamp-2 max-w-[200px]" title={v}>
              {v || "—"}
            </span>
          ),
        },
      ];
    }
    if (activeKind === "motor_shipping") {
      return [
        {
          key: "actions",
          label: "",
          render: (_, row) => (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded p-1.5 text-primary hover:bg-primary/10"
                aria-label="Edit"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row)}
                className="rounded p-1.5 text-danger hover:bg-danger/10"
                aria-label="Delete"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          ),
        },
        { key: "date", label: "Date" },
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "mannerOfTransport", label: "Transport" },
        { key: "freight", label: "Freight" },
        { key: "pickedBy", label: "Picked by" },
        {
          key: "charges",
          label: "Charges",
          render: (v) => <span className="tabular-nums">{chargesDisplay(v)}</span>,
        },
        {
          key: "notes",
          label: "Notes",
          render: (v) => (
            <span className="line-clamp-2 max-w-[200px]" title={v}>
              {v || "—"}
            </span>
          ),
        },
      ];
    }
    return [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              aria-label="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row)}
              className="rounded p-1.5 text-danger hover:bg-danger/10"
              aria-label="Delete"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      { key: "date", label: "Date" },
      {
        key: "po",
        label: "PO",
        render: (_, row) => row.poNumberSnapshot || row.purchaseOrderId || "—",
      },
      { key: "invoiceNumber", label: "Vendor inv. #" },
      { key: "mannerOfTransport", label: "Transport" },
      { key: "freight", label: "Freight" },
      { key: "droppedBy", label: "Received by" },
      {
        key: "charges",
        label: "Charges",
        render: (v) => <span className="tabular-nums">{chargesDisplay(v)}</span>,
      },
      {
        key: "notes",
        label: "Notes",
        render: (v) => (
          <span className="line-clamp-2 max-w-[200px]" title={v}>
            {v || "—"}
          </span>
        ),
      },
    ];
  }, [activeKind, fmt]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Logistics</h1>
        <p className="mt-1 text-sm text-secondary">
          Receiving and shipping motors (repair workflow), and receiving shipments against vendor purchase
          orders.
        </p>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-white"
                : "bg-card text-secondary hover:bg-muted/50 hover:text-title"
            }`}
          >
            <span className="block">{t.label}</span>
            <span className={`mt-0.5 block text-xs ${tab === t.id ? "text-white/85" : "text-secondary"}`}>
              {t.sub}
            </span>
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
          >
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add entry
          </Button>
        </div>
      </div>

      <div className="mt-4 min-h-0 min-w-0 flex-1">
        <Table
          columns={columns}
          data={rows}
          rowKey="id"
          loading={loading}
          emptyMessage="No entries yet. Use Add entry to log receiving or shipping."
          onRefresh={load}
          responsive
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit logistics entry" : "New logistics entry"}
        size="2xl"
        actions={
          <>
            {editingId ? (
              <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" form="logistics-form" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="logistics-form" onSubmit={submit} className="flex flex-col gap-4 !space-y-0">
          <p className="text-sm font-medium text-title">
            {TABS.find((x) => x.id === tab)?.label}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeKind === "motor_shipping" && (
              <div className="contents sm:col-span-2">
                <Select
                  label="Invoice #"
                  options={invoiceDropdownOptions}
                  value={invoiceSelectValue}
                  onChange={(e) => {
                    const v = e.target.value ?? "";
                    if (v === MANUAL_OPTION) {
                      setForm((f) => ({ ...f, invoiceNumber: "" }));
                    } else {
                      setForm((f) => ({ ...f, invoiceNumber: v }));
                    }
                  }}
                  searchable
                />
                {invoiceSelectValue === MANUAL_OPTION && (
                  <Input
                    label="Invoice # (manual)"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    placeholder="e.g. INV-1001"
                    className="sm:col-span-2"
                  />
                )}
              </div>
            )}
            {activeKind === "motor_receiving" && (
              <div className="contents sm:col-span-2">
                <Select
                  label="REF#"
                  options={refDropdownOptions}
                  value={refSelectValue}
                  onChange={(e) => {
                    const v = e.target.value ?? "";
                    if (v === MANUAL_OPTION) {
                      setForm((f) => ({ ...f, jobNumber: "" }));
                    } else {
                      setForm((f) => ({ ...f, jobNumber: v }));
                    }
                  }}
                  searchable
                />
                {refSelectValue === MANUAL_OPTION && (
                  <Input
                    label="REF# / Job # (manual)"
                    value={form.jobNumber}
                    onChange={(e) => setForm((f) => ({ ...f, jobNumber: e.target.value }))}
                    placeholder="e.g. A00001 or W-A00001-1"
                    className="sm:col-span-2"
                  />
                )}
              </div>
            )}
            {activeKind === "vendor_po_receiving" && (
              <>
                <Select
                  label="Purchase order (optional)"
                  options={poOptions}
                  value={form.purchaseOrderId}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseOrderId: e.target.value ?? "" }))}
                  searchable
                  className="sm:col-span-2"
                />
                {form.purchaseOrderId?.trim() && (
                  <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-sm font-medium text-title">PO line receipt</p>
                    <p className="mt-0.5 text-xs text-secondary">
                      Mark each line <strong>Received</strong> or <strong>Back Order</strong>. When every line is
                      Received, the PO delivery status becomes <strong>Delivered</strong>.
                    </p>
                    {poDetailLoading && (
                      <p className="mt-3 text-sm text-secondary">Loading line items…</p>
                    )}
                    {!poDetailLoading &&
                      selectedPoDetail &&
                      (!selectedPoDetail.lineItems || selectedPoDetail.lineItems.length === 0) && (
                        <p className="mt-3 text-sm text-secondary">This PO has no line items.</p>
                      )}
                    {!poDetailLoading &&
                      selectedPoDetail &&
                      selectedPoDetail.lineItems &&
                      selectedPoDetail.lineItems.length > 0 && (
                        <div className="mt-3 overflow-x-auto rounded-md border border-border bg-card">
                          <table className="w-full min-w-[480px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40 text-secondary">
                                <th className="px-3 py-2 font-medium">#</th>
                                <th className="px-3 py-2 font-medium">Description</th>
                                <th className="px-3 py-2 font-medium">Qty</th>
                                <th className="px-3 py-2 font-medium">Receipt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPoDetail.lineItems.map((line, idx) => (
                                <tr key={idx} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 tabular-nums text-secondary">{idx + 1}</td>
                                  <td className="max-w-[220px] px-3 py-2 text-title">
                                    <span className="line-clamp-2" title={line.description}>
                                      {line.description || "—"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 tabular-nums">
                                    {line.qty ?? "1"}
                                    {line.uom ? ` ${line.uom}` : ""}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-3">
                                      <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                                        <input
                                          type="radio"
                                          name={`po-line-${idx}`}
                                          checked={poLineReceipts[idx] === "Received"}
                                          onChange={() =>
                                            setPoLineReceipts((prev) => {
                                              const next = [...prev];
                                              next[idx] = "Received";
                                              return next;
                                            })
                                          }
                                          className="text-primary"
                                        />
                                        Received
                                      </label>
                                      <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                                        <input
                                          type="radio"
                                          name={`po-line-${idx}`}
                                          checked={poLineReceipts[idx] === "Back Order"}
                                          onChange={() =>
                                            setPoLineReceipts((prev) => {
                                              const next = [...prev];
                                              next[idx] = "Back Order";
                                              return next;
                                            })
                                          }
                                          className="text-primary"
                                        />
                                        Back Order
                                      </label>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                )}
                <Input
                  label="Vendor invoice #"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                  placeholder="Packing slip / vendor invoice #"
                />
              </>
            )}
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
            <Select
              label="Manner of transport"
              options={TRANSPORT_OPTIONS}
              value={form.mannerOfTransport}
              onChange={(e) => setForm((f) => ({ ...f, mannerOfTransport: e.target.value ?? "" }))}
              searchable={false}
            />
            <Input
              label="Freight"
              value={form.freight}
              onChange={(e) => setForm((f) => ({ ...f, freight: e.target.value }))}
              placeholder="Carrier, account #, BOL, etc."
              className="sm:col-span-2"
            />
            {activeKind === "motor_receiving" && (
              <Input
                label="Dropped by"
                value={form.droppedBy}
                onChange={(e) => setForm((f) => ({ ...f, droppedBy: e.target.value }))}
                placeholder="Who delivered / dropped off"
                className="sm:col-span-2"
              />
            )}
            {activeKind === "motor_shipping" && (
              <Input
                label="Picked by"
                value={form.pickedBy}
                onChange={(e) => setForm((f) => ({ ...f, pickedBy: e.target.value }))}
                placeholder="Carrier / customer who picked up"
                className="sm:col-span-2"
              />
            )}
            {activeKind === "vendor_po_receiving" && (
              <Input
                label="Received by"
                value={form.droppedBy}
                onChange={(e) => setForm((f) => ({ ...f, droppedBy: e.target.value }))}
                placeholder="Who received the shipment"
                className="sm:col-span-2"
              />
            )}
            <Input
              label="Charges"
              value={form.charges}
              onChange={(e) => setForm((f) => ({ ...f, charges: e.target.value }))}
              placeholder="e.g. 125.00"
            />
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Additional details"
            rows={3}
          />
        </Form>
      </Modal>
    </div>
  );
}
