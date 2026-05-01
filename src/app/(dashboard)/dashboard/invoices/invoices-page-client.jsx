"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FiEdit2,
  FiTrash2,
  FiSend,
  FiPrinter,
  FiRotateCw,
  FiDollarSign,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import InvoicePrintOffscreen from "@/components/dashboard/invoice-print-offscreen";
import CrmPlaceholder from "@/components/dashboard/crm-placeholder";
import { invoiceStatusLabel, invoiceStatusBadgeVariant } from "@/lib/invoice-status";
import { invoiceLineTotal } from "@/lib/invoice-amounts";

function InvoicesInner() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const draftQuoteParam = searchParams.get("draftQuote");
  const { settings: accountSettings } = useUserSettings();
  const fmt = useFormatMoney();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceSort, setInvoiceSort] = useState({ key: null, direction: "asc" });
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);

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

  const sortedRows = useMemo(() => {
    const sortKey = invoiceSort?.key;
    const dir = invoiceSort?.direction === "desc" ? -1 : 1;
    if (!sortKey) return filteredRows;

    const comparePrimary = (a, b) => {
      switch (sortKey) {
        case "invoiceNumber": {
          const va = String(a.invoiceNumber || "").toLowerCase();
          const vb = String(b.invoiceNumber || "").toLowerCase();
          return va.localeCompare(vb, undefined, { numeric: true }) * dir;
        }
        case "customerName": {
          const va = String(a.customerName || "").toLowerCase();
          const vb = String(b.customerName || "").toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        case "date": {
          const va = String(a.date || "").trim().toLowerCase();
          const vb = String(b.date || "").trim().toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        case "totalAmount":
          return (invoiceLineTotal(a) - invoiceLineTotal(b)) * dir;
        case "status": {
          const va = String(a.status || "").toLowerCase();
          const vb = String(b.status || "").toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        default:
          return 0;
      }
    };

    const list = [...filteredRows];
    list.sort((a, b) => {
      const primary = comparePrimary(a, b);
      if (primary !== 0) return primary;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    return list;
  }, [filteredRows, invoiceSort]);

  const handleInvoiceSort = useCallback((key, direction) => {
    setInvoiceSort({ key, direction });
  }, []);

  const statusSummaryCards = useMemo(() => {
    return [
      {
        key: "draft",
        label: "Draft",
        count: rows.filter((r) => r.status === "draft").length,
        amount: rows.filter((r) => r.status === "draft").reduce((sum, r) => sum + invoiceLineTotal(r), 0),
      },
      {
        key: "sent",
        label: "Sent",
        count: rows.filter((r) => r.status === "sent").length,
        amount: rows.filter((r) => r.status === "sent").reduce((sum, r) => sum + invoiceLineTotal(r), 0),
      },
      {
        key: "partial_paid",
        label: "Partial Paid",
        count: rows.filter((r) => r.status === "partial_paid").length,
        amount: rows.filter((r) => r.status === "partial_paid").reduce((sum, r) => sum + invoiceLineTotal(r), 0),
      },
      {
        key: "fully_paid",
        label: "Fully Paid",
        count: rows.filter((r) => r.status === "fully_paid").length,
        amount: rows.filter((r) => r.status === "fully_paid").reduce((sum, r) => sum + invoiceLineTotal(r), 0),
      },
    ];
  }, [rows]);

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
          fromShopLogoUrl: (inv.fromShopLogoUrl || accountSettings?.logoUrl || "").trim(),
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
      { key: "invoiceNumber", label: "Invoice#", clickable: true, sortable: true },
      { key: "customerName", label: "Customer", sortable: true },
      { key: "date", label: "Date", sortable: true },
      {
        key: "totalAmount",
        label: "Total Amount",
        sortable: true,
        render: (_, row) => fmt(invoiceLineTotal(row)),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => (
          <Badge variant={invoiceStatusBadgeVariant(v)}>{invoiceStatusLabel(v)}</Badge>
        ),
      },
    ],
    [fmt, handleDeleteCb, handleSendCb, openPrintCb, sendingInvoiceId]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[86.4rem] flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Invoices</h1>
        <p className="mt-2 text-sm text-secondary">
          Bills from quotes—edit, send, print, and track payment.
        </p>
      </div>

      <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statusSummaryCards.map((card) => (
          <div key={card.key} className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <FiDollarSign className="h-4 w-4" aria-hidden />
              {card.label}
            </div>
            <p className="mt-1 text-2xl font-bold tabular text-title">{fmt(card.amount)}</p>
            <p className="text-xs text-secondary">Count: {card.count}</p>
          </div>
        ))}
      </div>

      <Table
        columns={columns}
        data={sortedRows}
        rowKey="id"
        loading={loading}
        fillHeight
        sortState={invoiceSort}
        onSort={handleInvoiceSort}
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

      <InvoicePrintOffscreen
        open={printOpen}
        payload={printPayload}
        onClose={() => {
          setPrintOpen(false);
          setPrintPayload(null);
        }}
      />
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
