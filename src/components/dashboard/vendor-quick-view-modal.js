"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";

export default function VendorQuickViewModal({ open, vendorId, onClose, zIndex = 110 }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    if (!open) {
      setVendor(null);
      setLoading(false);
      return;
    }
    if (!vendorId) return;
    let cancelled = false;
    setLoading(true);
    setVendor(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/vendors/${vendorId}`, {
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, vendorId, toast, onClose]);

  const partsLabels = Array.isArray(vendor?.partsSupplied)
    ? vendor.partsSupplied.map((p) => (typeof p === "string" ? p : p?.item ?? "")).filter(Boolean)
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vendor?.name ? vendor.name : "Vendor"}
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
      ) : vendor ? (
        <div className="space-y-4">
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
        </div>
      ) : null}
    </Modal>
  );
}
