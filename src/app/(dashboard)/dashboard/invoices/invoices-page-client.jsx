"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FiEdit2,
  FiTrash2,
  FiSend,
  FiPrinter,
  FiRotateCw,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import CrmPlaceholder from "@/components/dashboard/crm-placeholder";
import { invoiceStatusLabel, invoiceStatusBadgeVariant } from "@/lib/invoice-status";

function InvoicesInner() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const draftQuoteParam = searchParams.get("draftQuote");
  const { settings: accountSettings } = useUserSettings();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);
  const printRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" });
      if (res.ok) setRows(await res.json());
      else setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const d = draftQuoteParam?.trim();
    const o = openId?.trim();
    if (d) {
      setInvoiceModal({ draftQuoteId: d });
      router.replace("/dashboard/invoices", { scroll: false });
      return;
    }
    if (o) {
      setInvoiceModal({ invoiceId: o });
      router.replace("/dashboard/invoices", { scroll: false });
    }
  }, [draftQuoteParam, openId, router]);

  useEffect(() => {
    if (!printOpen) return;
    const styleId = "invoice-print-page-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .invoice-print-preview, .invoice-print-preview * { visibility: visible; }
        .invoice-print-preview {
          position: fixed !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important;
          width: 100% !important; height: 100% !important; background: white !important; z-index: 99999 !important;
          overflow: auto !important;
        }
        .invoice-print-preview .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [printOpen]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.invoiceNumber, r.rfqNumber, r.customerName, r.date, r.status, r.id]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [rows, searchQuery]);

  const runPrint = () => {
    requestAnimationFrame(() => {
      window.print();
      setPrintOpen(false);
      setPrintPayload(null);
    });
  };

  const handleDeleteCb = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Delete invoice",
        message: `Delete invoice #${row.invoiceNumber || row.id}? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/dashboard/invoices/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Delete failed");
        toast.success("Invoice deleted.");
        load();
      } catch (e) {
        toast.error(e.message || "Could not delete");
      }
    },
    [confirm, toast, load]
  );

  const handleSendCb = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Send invoice to client",
        message: `Email invoice #${row.invoiceNumber || ""} to the customer on file?`,
        confirmLabel: "Send",
      });
      if (!ok) return;
      setSendingInvoiceId(row.id);
      try {
        const res = await fetch(`/api/dashboard/invoices/${row.id}/send`, {
          method: "POST",
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Send failed");
        toast.success(d.message || "Sent.");
        load();
      } catch (e) {
        toast.error(e.message || "Could not send");
      } finally {
        setSendingInvoiceId(null);
      }
    },
    [confirm, toast, load]
  );

  const openPrintCb = useCallback(
    async (row) => {
      try {
        const res = await fetch(`/api/dashboard/invoices/${row.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const inv = await res.json();
        if (!res.ok) throw new Error(inv.error || "Failed to load invoice");
        setPrintPayload({
          invoice: inv,
          motorLabel: inv.motorLabel,
          fromShopName: inv.fromShopName || "",
          fromShopContact: inv.fromShopContact || "",
          fromBillingAddress: inv.fromBillingAddress || "",
          fromPaymentTermsLabel:
            inv.fromPaymentTermsLabel || accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms),
          customerToName: inv.customerToName || "",
          customerBillingAddress: inv.customerBillingAddress || "",
          invoicePaymentOptions: accountSettings?.invoicePaymentOptions || "",
          invoiceThankYouNote: accountSettings?.invoiceThankYouNote || "",
        });
        setPrintOpen(true);
      } catch (e) {
        toast.error(e.message || "Could not open print view");
      }
    },
    [toast, accountSettings]
  );

  const columns = useMemo(
    () => [
      {
        key: "_actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex flex-wrap justify-start gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                setInvoiceModal({ invoiceId: row.id });
              }}
            >
              <FiEdit2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title={sendingInvoiceId === row.id ? "Sending…" : "Send to client"}
              disabled={sendingInvoiceId != null}
              onClick={(e) => {
                e.stopPropagation();
                handleSendCb(row);
              }}
            >
              {sendingInvoiceId === row.id ? (
                <FiRotateCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FiSend className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Print"
              onClick={(e) => {
                e.stopPropagation();
                openPrintCb(row);
              }}
            >
              <FiPrinter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-danger"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCb(row);
              }}
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
      { key: "invoiceNumber", label: "Invoice#", clickable: true },
      { key: "customerName", label: "Customer" },
      { key: "date", label: "Date" },
      {
        key: "status",
        label: "Status",
        render: (v) => (
          <Badge variant={invoiceStatusBadgeVariant(v)}>{invoiceStatusLabel(v)}</Badge>
        ),
      },
    ],
    [handleDeleteCb, handleSendCb, openPrintCb, sendingInvoiceId]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Invoices</h1>
        <p className="mt-2 text-sm text-secondary">
          Create from a quote (opens here). Nothing is saved until you click Save. Then edit, send to client,
          print, or delete from this list.
        </p>
      </div>

      <Table
        columns={columns}
        data={filteredRows}
        rowKey="id"
        loading={loading}
        fillHeight
        searchable
        onSearch={setSearchQuery}
        searchPlaceholder="Search invoice#, customer, date, status…"
        onCellClick={(row) => setInvoiceModal({ invoiceId: row.id })}
        onRefresh={load}
        emptyMessage={
          rows.length === 0
            ? "No invoices yet. On Quotes, choose Create invoice — then Save on this page to add a row."
            : filteredRows.length === 0 && searchQuery.trim()
              ? "No invoices match your search."
              : "No invoices match."
        }
      />

      <InvoiceFormModal
        open={!!invoiceModal}
        draftQuoteId={invoiceModal?.draftQuoteId ?? null}
        invoiceId={invoiceModal?.invoiceId ?? null}
        onClose={() => setInvoiceModal(null)}
        onAfterSave={load}
        onSwitchToInvoice={(id) => setInvoiceModal({ invoiceId: id })}
        zIndex={55}
      />

      {printOpen && printPayload && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={printRef}
              className="invoice-print-preview fixed inset-0 overflow-auto bg-card p-6 text-title"
              style={{ zIndex: 99999 }}
            >
              <div className="no-print mb-4 flex justify-end gap-2 border-b border-border pb-4">
                <Button type="button" variant="outline" size="sm" onClick={runPrint}>
                  <FiPrinter className="mr-1.5 inline h-4 w-4" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPrintOpen(false);
                    setPrintPayload(null);
                  }}
                >
                  Close
                </Button>
              </div>
              <InvoicePrintPreview
                invoice={printPayload.invoice}
                motorLabel={printPayload.motorLabel}
                fromShopName={printPayload.fromShopName}
                fromShopContact={printPayload.fromShopContact}
                fromBillingAddress={printPayload.fromBillingAddress}
                fromPaymentTermsLabel={printPayload.fromPaymentTermsLabel}
                customerToName={printPayload.customerToName}
                customerBillingAddress={printPayload.customerBillingAddress}
                invoicePaymentOptions={printPayload.invoicePaymentOptions}
                invoiceThankYouNote={printPayload.invoiceThankYouNote}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function InvoicesPageClient() {
  return (
    <Suspense fallback={<CrmPlaceholder title="Invoices" description="Loading…" />}>
      <InvoicesInner />
    </Suspense>
  );
}
