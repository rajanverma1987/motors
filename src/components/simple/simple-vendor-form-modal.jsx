"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import SimpleVendorFormFields from "@/components/simple/simple-vendor-form-fields";
import { useAlert } from "@/components/confirm-provider";
import { formatDateMdy } from "@/lib/format-date";
import { formatSimpleMoney } from "@/lib/simple-service-proposal-form";
import {
  buildVendorPayload,
  INITIAL_VENDOR_FORM,
  vendorApiToForm,
} from "@/lib/vendor-record-form";
import { resolvePoStatus } from "@/lib/simple-purchase-order-form";

const VENDOR_FORM_ID = "simple-vendor-form-modal";

const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";
const TH_CLASS =
  "pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary";
const TD_CLASS = "pl-[5px] pr-1 py-1 text-sm text-title whitespace-nowrap";
const TABLE_WRAP = "overflow-x-auto rounded-sm border border-border";
const TABLE_CLASS = "w-full min-w-[18rem] border-collapse text-sm";
const THEAD_ROW = "border-b border-border bg-primary/[0.06] dark:bg-primary/10";

function poStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "received") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

/**
 * Simple portal vendor details — dense FieldRow form + related Simple POs.
 */
export default function SimpleVendorFormModal({
  open,
  vendorId,
  onClose,
  relatedPos = [],
  onVendorUpdated,
  onOpenPo,
  zIndex = 120,
}) {
  const alert = useAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_VENDOR_FORM);
  const resolvedId = String(vendorId || "").trim();

  const loadVendor = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/vendors/${resolvedId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load vendor");
      setForm(vendorApiToForm(data));
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to load vendor",
        variant: "danger",
      });
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [resolvedId, alert, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_VENDOR_FORM);
      setLoading(false);
      setSaving(false);
      return;
    }
    if (!resolvedId) return;
    void loadVendor();
  }, [open, resolvedId, loadVendor]);

  const vendorPos = useMemo(() => {
    const vid = resolvedId;
    if (!vid) return [];
    return (Array.isArray(relatedPos) ? relatedPos : []).filter(
      (po) => String(po?.vendorId || "").trim() === vid
    );
  }, [relatedPos, resolvedId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolvedId) return;
    if (!String(form.name || "").trim()) {
      await alert({ title: "Error", message: "Vendor name is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/vendors/${resolvedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildVendorPayload(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update vendor");
      const updated = data.vendor || data;
      const nextForm = vendorApiToForm(updated);
      setForm(nextForm);
      onVendorUpdated?.({ ...updated, id: String(updated?.id || resolvedId) });
      await alert({ title: "Success", message: "Vendor updated." });
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to update vendor",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (saving) return;
        onClose?.();
      }}
      title="Vendor details"
      size="6xl"
      width="min(1100px, 96vw)"
      height="min(84vh, 820px)"
      zIndex={zIndex}
      showClose={!saving}
      closeOnOutsideClick={false}
      actions={
        resolvedId && !loading ? (
          <Button type="submit" form={VENDOR_FORM_ID} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-secondary">Loading…</span>
        </div>
      ) : resolvedId ? (
        <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Form
            id={VENDOR_FORM_ID}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          >
            <SimpleVendorFormFields form={form} setForm={setForm} disabled={saving} />
          </Form>

          <div className="flex min-w-0 flex-col gap-2">
            <p className={SECTION_TITLE}>Purchase orders ({vendorPos.length})</p>
            {vendorPos.length === 0 ? (
              <p className="text-xs text-secondary">No Simple purchase orders for this vendor.</p>
            ) : (
              <div className={TABLE_WRAP}>
                <table className={TABLE_CLASS}>
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className={TH_CLASS}>PO #</th>
                      <th className={TH_CLASS}>Date</th>
                      <th className={TH_CLASS}>Status</th>
                      <th className={`${TH_CLASS} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorPos.map((po) => {
                      const status = resolvePoStatus(po.lineItems);
                      return (
                        <tr key={po.id} className="border-b border-border last:border-b-0">
                          <td className={TD_CLASS}>
                            {typeof onOpenPo === "function" && po.id ? (
                              <button
                                type="button"
                                className="font-medium text-primary hover:underline"
                                onClick={() => onOpenPo(po)}
                                title="Open purchase order"
                              >
                                {po.poNumber || "—"}
                              </button>
                            ) : (
                              po.poNumber || "—"
                            )}
                          </td>
                          <td className={TD_CLASS}>{formatDateMdy(po.poCutDate) || "—"}</td>
                          <td className={TD_CLASS}>
                            {status ? (
                              <Badge
                                variant={poStatusBadgeVariant(status)}
                                className="rounded-full px-2.5 py-0.5 text-xs"
                              >
                                {status}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={`${TD_CLASS} text-right`}>
                            {formatSimpleMoney(Number(po.grandTotal) || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
