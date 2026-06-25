"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/button";
import PoPrintSheetBody from "@/components/dashboard/po-print-sheet-body";
import { formatMoney } from "@/lib/format-currency";

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
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, status } : item)));
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
      setPo((prev) => (prev ? { ...prev, lineItems: data.lineItems ?? lineItems } : prev));
    } catch (err) {
      alert(err.message || "Failed to save status");
    } finally {
      setSaving(false);
    }
  };

  const hasStatusChange =
    po &&
    Array.isArray(po.lineItems) &&
    lineItems.some(
      (item, i) => (po.lineItems[i]?.status ?? "Ordered") !== (item?.status ?? "Ordered")
    );

  const handlePrint = () => {
    window.print();
  };

  const fmt = useMemo(() => {
    const code = po?.currency || "USD";
    return (v) => formatMoney(v, code);
  }, [po?.currency]);

  const poSettings = useMemo(() => {
    if (!po) return {};
    return {
      logoUrl: po.fromShopLogoUrl,
      accountsBillingAddress: po.fromAccountsBillingAddress,
      accountsShippingAddress: po.fromAccountsShippingAddress,
      invoiceThankYouNote: po.invoiceThankYouNote,
    };
  }, [po]);

  const poForPrint = useMemo(() => {
    if (!po) return null;
    return { ...po, lineItems };
  }, [po, lineItems]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-600">Loading purchase order…</p>
      </div>
    );
  }
  if (error || !po || !poForPrint) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="font-medium text-red-600">{error || "Purchase order not found"}</p>
          <p className="mt-2 text-sm text-gray-600">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[52.8rem] print:max-w-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-xl font-bold text-gray-900">
            {po.poNumber ? `Purchase Order ${po.poNumber}` : "Purchase Order"}
          </h1>
          <div className="flex items-center gap-2">
            {hasStatusChange && (
              <Button type="button" variant="primary" size="sm" onClick={saveStatuses} disabled={saving}>
                {saving ? "Saving…" : "Save delivery status"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
        </div>

        <PoPrintSheetBody
          po={poForPrint}
          vendor={po.vendor}
          settings={poSettings}
          fmt={fmt}
          vendorLineStatus={{ onStatusChange: setItemStatus }}
        />
      </div>
    </div>
  );
}
