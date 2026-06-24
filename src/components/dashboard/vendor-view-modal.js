"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

const PO_STATUS_VARIANT = {
  Open: "default",
  "Partially Invoiced": "warning",
  "Fully Invoiced": "primary",
  "Partially Paid": "warning",
  "Fully Paid": "success",
  Closed: "success",
};

const INVOICED_STATUS_VARIANT = {
  Partial: "warning",
  Invoiced: "success",
  "—": "default",
};

const PAID_STATUS_VARIANT = {
  Partially: "warning",
  Paid: "success",
  "—": "default",
};

function ActivityTableBody({ loading, isEmpty, emptyMessage, children }) {
  if (loading) {
    return (
      <div
        className="flex min-h-[7rem] items-center justify-center gap-2 rounded border border-border bg-form-bg/30 py-8"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span
          className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden
        />
        <span className="text-sm text-secondary">Loading…</span>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="text-sm text-secondary">{emptyMessage}</p>;
  }
  return children;
}

function statusAmountSummary(rows, getAmount, getStatus) {
  const totals = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const status = String(getStatus(row) || "—").trim() || "—";
    const amount = Number.parseFloat(String(getAmount(row) ?? "0"));
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    totals.set(status, (totals.get(status) || 0) + safeAmount);
  });
  return Array.from(totals.entries()).map(([status, amount]) => ({ status, amount }));
}

/**
 * Vendor profile + purchase orders, vendor invoices, and payments (like customer activity modal).
 */
export default function VendorViewModal({
  open,
  vendorId,
  onClose,
  zIndex = 110,
  onEdit,
}) {
  const toast = useToast();
  const router = useRouter();
  const fmt = useFormatMoney();
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [activity, setActivity] = useState({
    purchaseOrders: [],
    vendorInvoices: [],
    payments: [],
  });

  const resolvedId = String(vendorId || vendor?.id || "").trim();

  const openRecordBtnClass =
    "font-mono text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";

  const refreshActivity = useCallback(async (id) => {
    const vid = String(id || "").trim();
    if (!vid) return;
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/dashboard/vendors/${vid}/activity`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load vendor activity");
      setActivity({
        purchaseOrders: Array.isArray(data.purchaseOrders) ? data.purchaseOrders : [],
        vendorInvoices: Array.isArray(data.vendorInvoices) ? data.vendorInvoices : [],
        payments: Array.isArray(data.payments) ? data.payments : [],
      });
    } catch (e) {
      toast.error(e.message || "Failed to load vendor activity");
      setActivity({ purchaseOrders: [], vendorInvoices: [], payments: [] });
    } finally {
      setLoadingActivity(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) {
      setVendor(null);
      setActivity({ purchaseOrders: [], vendorInvoices: [], payments: [] });
      setLoadingVendor(false);
      setLoadingActivity(false);
      return;
    }
    if (!resolvedId) return;

    let cancelled = false;
    setLoadingVendor(true);
    setVendor(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/vendors/${resolvedId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load vendor");
        setVendor(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.message || "Failed to load vendor");
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoadingVendor(false);
      }
    })();

    refreshActivity(resolvedId);

    return () => {
      cancelled = true;
    };
  }, [open, resolvedId, toast, onClose, refreshActivity]);

  const openPo = useCallback(
    (poId) => {
      const id = String(poId || "").trim();
      if (!id) return;
      onClose?.();
      router.push(`/dashboard/purchase-orders?open=${encodeURIComponent(id)}`);
    },
    [router, onClose]
  );

  const poStatusTotals = useMemo(
    () => statusAmountSummary(activity.purchaseOrders, (r) => r.orderTotal, (r) => r.status),
    [activity.purchaseOrders]
  );

  const partsLabels = Array.isArray(vendor?.partsSupplied)
    ? vendor.partsSupplied.map((p) => (typeof p === "string" ? p : p?.item ?? "")).filter(Boolean)
    : [];

  const loading = loadingVendor && !vendor;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vendor?.name ? vendor.name : "Vendor"}
      size="4xl"
      zIndex={zIndex}
      actions={
        <>
          {onEdit && vendor ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(vendor)}>
              Edit
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="py-6 text-center text-secondary">Loading…</p>
      ) : vendor ? (
        <div className="max-h-[min(72vh,42rem)] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Contact</p>
            <p className="mt-1 text-lg font-semibold text-title">{vendor.contactName || "—"}</p>
            <p className="mt-1 text-sm text-secondary">
              {[vendor.phone, vendor.email].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Address</h3>
              <p className="mt-2 text-sm text-title">
                {[vendor.address, vendor.city, vendor.state, vendor.zipCode].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Payment terms</h3>
              <p className="mt-2 text-sm text-title">{vendor.paymentTerms || "—"}</p>
            </div>
          </div>

          {partsLabels.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Parts supplied</h3>
              <p className="mt-2 text-sm text-title">{partsLabels.join(", ")}</p>
            </div>
          ) : null}

          {(vendor.notes || "").trim() ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{vendor.notes}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
              Purchase orders ({loadingActivity ? "…" : activity.purchaseOrders.length})
            </h3>
            {!loadingActivity && poStatusTotals.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {poStatusTotals.map((s) => (
                  <span key={`po-s-${s.status}`} className="inline-flex flex-wrap items-center gap-1.5">
                    <Badge variant={PO_STATUS_VARIANT[s.status] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
                      {s.status}
                    </Badge>
                    <span className="text-sm text-title">{fmt(s.amount)}</span>
                  </span>
                ))}
              </div>
            ) : null}
            <ActivityTableBody
              loading={loadingActivity}
              isEmpty={activity.purchaseOrders.length === 0}
              emptyMessage="No purchase orders for this vendor."
            >
              <div className="overflow-x-auto rounded border border-border">
                <table className="dashboard-data-table w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">PO #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Invoiced</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Paid</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">Order</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">Due</th>
                    </tr>
                  </thead>
                  <tbody className="text-title">
                    {activity.purchaseOrders.map((po) => (
                      <tr key={po.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <button type="button" className={openRecordBtnClass} onClick={() => openPo(po.id)} title="Open purchase order">
                            {po.poNumber || "—"}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={PO_STATUS_VARIANT[po.status] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
                            {po.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={INVOICED_STATUS_VARIANT[po.invoicedStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
                            {po.invoicedStatus ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={PAID_STATUS_VARIANT[po.paidStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
                            {po.paidStatus ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(po.orderTotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(po.balanceDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ActivityTableBody>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
              Vendor invoices ({loadingActivity ? "…" : activity.vendorInvoices.length})
            </h3>
            <ActivityTableBody
              loading={loadingActivity}
              isEmpty={activity.vendorInvoices.length === 0}
              emptyMessage="No vendor invoices recorded."
            >
              <div className="overflow-x-auto rounded border border-border">
                <table className="dashboard-data-table w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">PO #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Invoice #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Date</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-title">
                    {activity.vendorInvoices.map((inv, idx) => (
                      <tr key={`${inv.poId}-${inv.invoiceNumber}-${idx}`} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <button type="button" className={openRecordBtnClass} onClick={() => openPo(inv.poId)} title="Open purchase order">
                            {inv.poNumber || "—"}
                          </button>
                        </td>
                        <td className="px-3 py-2">{inv.invoiceNumber || "—"}</td>
                        <td className="px-3 py-2">{inv.date || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(inv.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ActivityTableBody>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
              Payments ({loadingActivity ? "…" : activity.payments.length})
            </h3>
            <ActivityTableBody
              loading={loadingActivity}
              isEmpty={activity.payments.length === 0}
              emptyMessage="No payments recorded."
            >
              <div className="overflow-x-auto rounded border border-border">
                <table className="dashboard-data-table w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">PO #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Method</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Reference</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-title">
                    {activity.payments.map((pay, idx) => (
                      <tr key={`${pay.poId}-${pay.date}-${idx}`} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <button type="button" className={openRecordBtnClass} onClick={() => openPo(pay.poId)} title="Open purchase order">
                            {pay.poNumber || "—"}
                          </button>
                        </td>
                        <td className="px-3 py-2">{pay.date || "—"}</td>
                        <td className="px-3 py-2">{pay.method || "—"}</td>
                        <td className="px-3 py-2">{pay.reference || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(pay.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ActivityTableBody>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
