"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";

export default function CustomerQuickViewModal({ open, customerId, onClose, zIndex = 110 }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    if (!customerId) return;
    let cancelled = false;
    setLoading(true);
    setCustomer(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/customers/${customerId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load customer");
        setCustomer(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.message || "Failed to load customer");
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId, toast, onClose]);

  const displayName =
    String(customer?.companyName || "").trim() ||
    String(customer?.primaryContactName || "").trim() ||
    "Customer";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={displayName !== "Customer" ? displayName : "Customer"}
      width="min(720px, 96vw)"
      zIndex={zIndex}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <p className="py-6 text-center text-secondary">Loading…</p>
      ) : customer ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Company</p>
                <p className="mt-1 text-lg font-semibold text-title">{customer.companyName || "—"}</p>
                <p className="mt-1 text-sm text-secondary">
                  {[customer.primaryContactName, customer.phone, customer.email]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Badge
                  variant={customer.taxExempt === false ? "warning" : "success"}
                  className="rounded-full px-2.5 py-0.5 text-xs"
                >
                  Tax exempt: {customer.taxExempt === false ? "No" : "Yes"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Billing address</h3>
              <p className="mt-2 text-sm text-title">
                {[customer.address, customer.city, customer.state, customer.zipCode, customer.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Details</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-secondary">EIN</dt>
                  <dd className="text-title">{customer.ein || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-secondary">Credit limit</dt>
                  <dd className="text-title">{customer.creditLimit || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-secondary">Tax %</dt>
                  <dd className="text-title">
                    {customer.taxExempt === false ? customer.taxPercent || "0" : "0"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {(customer.notes || "").trim() ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{customer.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
