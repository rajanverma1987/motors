"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/button";
import PoVendorAccountsSection from "@/components/dashboard/po-vendor-accounts-section";

export default function PoVendorViewPage() {
  const params = useParams();
  const token = params?.token;
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lineItems, setLineItems] = useState([]);

  const loadPo = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/po/vendor/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Purchase order not found");
        setPo(null);
        return;
      }
      setPo(data);
      setLineItems(Array.isArray(data.lineItems) ? data.lineItems.map((i) => ({ ...i })) : []);
    } catch {
      setError("Failed to load purchase order");
      setPo(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid link");
      return;
    }
    loadPo();
  }, [token, loadPo]);

  const setItemStatus = (index, status) => {
    setLineItems((prev) => {
      const next = prev.map((item, i) => (i === index ? { ...item, status } : item));
      return next;
    });
  };

  const saveStatuses = async () => {
    if (!token || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/po/vendor/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setLineItems(data.lineItems ?? lineItems);
    } catch (err) {
      alert(err.message || "Failed to save status");
    } finally {
      setSaving(false);
    }
  };

  const hasStatusChange = po && Array.isArray(po.lineItems) && lineItems.some((item, i) => (po.lineItems[i]?.status ?? "Ordered") !== (item?.status ?? "Ordered"));

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-secondary">Loading purchase order…</p>
      </div>
    );
  }
  if (error || !po) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive font-medium">{error || "Purchase order not found"}</p>
          <p className="mt-2 text-sm text-secondary">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-title">
      <div className="mx-auto max-w-4xl px-4 py-8 print:py-4">
        {/* Actions: print and save status - hidden when printing */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-xl font-bold">{po.poNumber ? `Purchase Order ${po.poNumber}` : "Purchase Order"}</h1>
          <div className="flex items-center gap-2">
            {hasStatusChange && (
              <Button type="button" variant="primary" size="sm" onClick={saveStatuses} disabled={saving}>
                {saving ? "Saving…" : "Save delivery status"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
              Print
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm print:shadow-none print:border print:p-4">
          {(po.shop?.name || po.shop?.contact) && (
            <section className="mb-6 border-b border-border pb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Motor Shop</h2>
              {po.shop?.name && <p className="font-semibold text-title">{po.shop.name}</p>}
              {po.shop?.contact && <p className="text-sm text-secondary">{po.shop.contact}</p>}
            </section>
          )}
          {(po.accountsBillingAddress || po.accountsShippingAddress) && (
            <section className="mb-6 border-b border-border pb-4">
              <PoVendorAccountsSection
                billingAddress={po.accountsBillingAddress}
                shippingAddress={po.accountsShippingAddress}
              />
            </section>
          )}
          {po.vendor && (
            <section className="mb-6 border-b border-border pb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Vendor</h2>
              {po.vendor?.name && <p className="font-semibold text-title">{po.vendor.name}</p>}
              {po.vendor?.contactName && <p className="text-sm text-secondary">{po.vendor.contactName}</p>}
              {(po.vendor?.address || po.vendor?.city || po.vendor?.state || po.vendor?.zipCode) && (
                <p className="text-sm text-secondary">
                  {[po.vendor.address, [po.vendor.city, po.vendor.state, po.vendor.zipCode].filter(Boolean).join(", ")].filter(Boolean).join(" — ")}
                </p>
              )}
              {(po.vendor?.phone || po.vendor?.email) && (
                <p className="text-sm text-secondary">
                  {[po.vendor.phone, po.vendor.email].filter(Boolean).join(" | ")}
                </p>
              )}
            </section>
          )}
          <div className="mb-6 border-b border-border pb-4">
            {po.poNumber && <p className="text-sm text-secondary">PO # {po.poNumber}</p>}
            <h2 className="text-lg font-semibold text-title">{po.vendorName}</h2>
            <p className="mt-1 text-sm text-secondary">Purchase Order (view only — use the link you received to print or update delivery status)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 text-left font-medium text-secondary">Description</th>
                  <th className="pb-2 pr-4 text-right font-medium text-secondary">Qty</th>
                  <th className="pb-2 pr-4 text-left font-medium text-secondary">UOM</th>
                  <th className="pb-2 pr-4 text-right font-medium text-secondary">Unit price</th>
                  <th className="pb-2 pr-4 text-right font-medium text-secondary">Total</th>
                  <th className="pb-2 text-left font-medium text-secondary print:hidden">Status</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row, i) => {
                  const q = parseFloat(row?.qty ?? "1");
                  const p = parseFloat(row?.unitPrice ?? "0");
                  const total = Number.isFinite(q) && Number.isFinite(p) ? (q * p).toFixed(2) : "—";
                  const status = row?.status ?? "Ordered";
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 pr-4 text-title">{row?.description || "—"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{row?.qty ?? "—"}</td>
                      <td className="py-2 pr-4 text-title">{row?.uom || "—"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{row?.unitPrice ? `$${row.unitPrice}` : "—"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">${total}</td>
                      <td className="py-2 print:hidden">
                        <select
                          value={status}
                          onChange={(e) => setItemStatus(i, e.target.value)}
                          className="rounded border border-border bg-background px-2 py-1 text-sm text-title focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="Ordered">Ordered</option>
                          <option value="Dispatch">Dispatch</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <p className="text-sm font-semibold text-title">Order total: ${po.totalOrder ?? "0.00"}</p>
          </div>

          {po.notes?.trim() && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-title">{po.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
