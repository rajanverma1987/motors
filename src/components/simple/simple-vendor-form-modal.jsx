"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import SimpleVendorFormFields from "@/components/simple/simple-vendor-form-fields";
import SimplePurchaseOrderFormModal from "@/components/simple/simple-purchase-order-form-modal";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { formatSimpleMoney } from "@/lib/simple-service-proposal-form";
import {
  buildVendorPayload,
  INITIAL_VENDOR_FORM,
  vendorApiToForm,
} from "@/lib/vendor-record-form";
import { resolvePoStatus, SIMPLE_PO_TYPE_JOB } from "@/lib/simple-purchase-order-form";
import { fetchSimplePurchaseOrders } from "@/lib/simple-portal-api";
import {
  OTHER_STATUS_ALL,
  normalizePoPaymentStatusKey,
  otherStatusTileColorForValue,
  poPaymentStatusTileColorForValue,
} from "@/lib/dropdown-catalog";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";

const VENDOR_FORM_ID = "simple-vendor-form-modal";

const SECTION_TITLE =
  "text-xs font-semibold uppercase tracking-[0.06em] text-title";
const TH_CLASS =
  "sticky top-0 z-20 border-b border-border bg-muted/40 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-secondary";
const TD_CLASS =
  "border-b border-border px-2 py-1.5 text-[12px] font-medium leading-snug text-title whitespace-nowrap";
const TD_MUTED_CLASS =
  "border-b border-border px-2 py-1.5 text-[11px] font-medium leading-snug text-secondary whitespace-nowrap";
const TABLE_WRAP = "min-h-0 flex-1 overflow-auto rounded-sm border border-border";
const TABLE_CLASS = "w-full min-w-[28rem] border-separate border-spacing-0 text-[12px]";
const THEAD_ROW = "";
const OPEN_PO_BTN_CLASS =
  "font-mono text-[12px] font-medium text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";
const STATUS_BADGE_CLASS = "rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-none";

function poStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "received") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function paymentStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "paid") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function poPaymentKey(po) {
  return normalizePoPaymentStatusKey(po?.paymentStatus || "Unpaid");
}

function poAmount(po) {
  const n = Number(po?.grandTotal);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Simple portal vendor details — dense FieldRow form + related Simple POs.
 */
export default function SimpleVendorFormModal({
  open,
  vendorId,
  onClose,
  /** Optional seed list while full vendor PO list loads. */
  relatedPos = [],
  onVendorUpdated,
  /** Called after a PO opened from this modal is saved (e.g. refresh parent list). */
  onPoSaved,
  zIndex = 120,
}) {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_VENDOR_FORM);
  const [vendorPos, setVendorPos] = useState([]);
  const [loadingPos, setLoadingPos] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(null);
  const [openPoId, setOpenPoId] = useState(null);
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

  const loadVendorPos = useCallback(async () => {
    if (!resolvedId) {
      setVendorPos([]);
      return;
    }
    setLoadingPos(true);
    try {
      const items = await fetchSimplePurchaseOrders({ vendorId: resolvedId });
      setVendorPos(Array.isArray(items) ? items : []);
    } catch {
      setVendorPos([]);
    } finally {
      setLoadingPos(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_VENDOR_FORM);
      setVendorPos([]);
      setLoading(false);
      setSaving(false);
      setLoadingPos(false);
      setPaymentStatusFilter(null);
      setOpenPoId(null);
      return;
    }
    if (!resolvedId) return;
    setPaymentStatusFilter(null);
    setOpenPoId(null);
    const seeded = (Array.isArray(relatedPos) ? relatedPos : []).filter(
      (po) => String(po?.vendorId || "").trim() === resolvedId
    );
    if (seeded.length) setVendorPos(seeded);
    void loadVendor();
    void loadVendorPos();
    // relatedPos is open-time seed only; full list comes from loadVendorPos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolvedId, loadVendor, loadVendorPos]);

  const paymentStatusTotals = useMemo(() => {
    const totals = new Map();
    for (const po of vendorPos) {
      const key = poPaymentKey(po);
      const prev = totals.get(key) || { status: key, amount: 0, count: 0 };
      totals.set(key, {
        status: key,
        amount: prev.amount + poAmount(po),
        count: prev.count + 1,
      });
    }
    const order = ["Unpaid", "Partial Paid", "Paid"];
    return [...totals.values()].sort((a, b) => {
      const ia = order.indexOf(a.status);
      const ib = order.indexOf(b.status);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return String(a.status).localeCompare(String(b.status));
    });
  }, [vendorPos]);

  const paymentFilterCards = useMemo(() => {
    const allTile = otherStatusTileColorForValue(mergedSettings, OTHER_STATUS_ALL, 0);
    const cards = [
      {
        key: "",
        label: allTile.label || "All",
        tileAppearance: resolveStatusTileProps(allTile.tileColor, allTile.index, {
          tileBgColor: allTile.tileBgColor,
          tileTextColor: allTile.tileTextColor,
          tileColor: allTile.tileColor,
        }),
      },
    ];
    for (const t of paymentStatusTotals) {
      const { tileColor, tileBgColor, tileTextColor, index, label } =
        poPaymentStatusTileColorForValue(mergedSettings, t.status);
      cards.push({
        key: t.status,
        label: label || t.status,
        tileAppearance: resolveStatusTileProps(tileColor, index, {
          tileBgColor,
          tileTextColor,
          tileColor,
        }),
      });
    }
    return cards;
  }, [paymentStatusTotals, mergedSettings]);

  const filteredVendorPos = useMemo(() => {
    if (!paymentStatusFilter) return vendorPos;
    return vendorPos.filter((po) => poPaymentKey(po) === paymentStatusFilter);
  }, [vendorPos, paymentStatusFilter]);

  const filteredSubtotal = useMemo(
    () => filteredVendorPos.reduce((sum, po) => sum + poAmount(po), 0),
    [filteredVendorPos]
  );

  const openPoFromTable = useCallback((po) => {
    const id = String(po?.id || "").trim();
    if (id) setOpenPoId(id);
  }, []);

  /** Navigate within the visible PO table (same pattern as Customer Details → Job). */
  const vendorPoNavigation = useMemo(() => {
    if (!openPoId || filteredVendorPos.length < 2) return null;
    const openIndex = filteredVendorPos.findIndex(
      (r) => String(r.id) === String(openPoId)
    );
    if (openIndex < 0) return null;
    return {
      currentIndex: openIndex,
      total: filteredVendorPos.length,
      canPrevious: openIndex > 0,
      canNext: openIndex < filteredVendorPos.length - 1,
      onPrevious: () => {
        const prev = filteredVendorPos[openIndex - 1];
        const id = String(prev?.id || "").trim();
        if (id) setOpenPoId(id);
      },
      onNext: () => {
        const next = filteredVendorPos[openIndex + 1];
        const id = String(next?.id || "").trim();
        if (id) setOpenPoId(id);
      },
    };
  }, [openPoId, filteredVendorPos]);

  const editingPo = useMemo(() => {
    if (!openPoId) return null;
    return (
      filteredVendorPos.find((p) => String(p.id) === String(openPoId)) ||
      vendorPos.find((p) => String(p.id) === String(openPoId)) ||
      { id: openPoId }
    );
  }, [openPoId, filteredVendorPos, vendorPos]);

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
    <>
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
        <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
          <Form
            id={VENDOR_FORM_ID}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          >
            <SimpleVendorFormFields form={form} setForm={setForm} disabled={saving} />
          </Form>

          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <p className={SECTION_TITLE}>
              Purchase orders (
              {loadingPos
                ? "…"
                : paymentStatusFilter
                  ? `${filteredVendorPos.length}/${vendorPos.length}`
                  : vendorPos.length}
              )
            </p>
            {!loadingPos && paymentFilterCards.length > 1 ? (
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {paymentFilterCards.map((card) => {
                  const active = (paymentStatusFilter || "") === (card.key || "");
                  const tile = card.tileAppearance || {};
                  return (
                    <button
                      key={card.key || "__all__"}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPaymentStatusFilter(card.key ? card.key : null)}
                      className={`inline-flex max-w-full items-center border px-2.5 py-1 text-left text-xs font-semibold leading-snug whitespace-normal break-words transition-[box-shadow,border-color] ${
                        active
                          ? "border-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
                          : "border-black/10 hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
                      } ${tile.className || ""}`}
                      style={tile.style || undefined}
                    >
                      {card.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {loadingPos && vendorPos.length === 0 ? (
              <p className="text-xs font-medium text-secondary">Loading purchase orders…</p>
            ) : filteredVendorPos.length === 0 ? (
              <p className="text-xs font-medium text-secondary">
                {paymentStatusFilter
                  ? "No purchase orders with this payment status."
                  : "No Simple purchase orders for this vendor."}
              </p>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                <div className="flex shrink-0 items-baseline justify-end gap-2 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-secondary">
                    Subtotal
                  </span>
                  <span className="min-w-[5.5rem] text-right text-[12px] font-semibold tabular-nums text-title">
                    {formatSimpleMoney(filteredSubtotal)}
                  </span>
                </div>
                <div className={TABLE_WRAP}>
                  <table className={TABLE_CLASS}>
                    <thead>
                      <tr className={THEAD_ROW}>
                        <th className={TH_CLASS}>PO #</th>
                        <th className={TH_CLASS}>Date</th>
                        <th className={TH_CLASS}>Status</th>
                        <th className={TH_CLASS}>Payment status</th>
                        <th className={`${TH_CLASS} text-right`}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendorPos.map((po) => {
                        const status = resolvePoStatus(po.lineItems);
                        const paymentStatus = String(po.paymentStatus || "").trim() || "Unpaid";
                        return (
                          <tr
                            key={po.id}
                            className="hover:bg-muted/25 last:[&>td]:border-b-0"
                          >
                            <td className={TD_CLASS}>
                              {po.id ? (
                                <button
                                  type="button"
                                  className={OPEN_PO_BTN_CLASS}
                                  onClick={() => openPoFromTable(po)}
                                  title="Open purchase order"
                                >
                                  {po.poNumber || "-"}
                                </button>
                              ) : (
                                <span className="font-mono text-[12px]">{po.poNumber || "-"}</span>
                              )}
                            </td>
                            <td className={TD_MUTED_CLASS}>{formatDate(po.poCutDate) || "-"}</td>
                            <td className={TD_CLASS}>
                              {status ? (
                                <Badge
                                  variant={poStatusBadgeVariant(status)}
                                  className={STATUS_BADGE_CLASS}
                                >
                                  {status}
                                </Badge>
                              ) : (
                                <span className="text-secondary">-</span>
                              )}
                            </td>
                            <td className={TD_CLASS}>
                              <Badge
                                variant={paymentStatusBadgeVariant(paymentStatus)}
                                className={STATUS_BADGE_CLASS}
                              >
                                {paymentStatus}
                              </Badge>
                            </td>
                            <td className={`${TD_CLASS} text-right tabular-nums`}>
                              {formatSimpleMoney(Number(po.grandTotal) || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>

    <SimplePurchaseOrderFormModal
      open={Boolean(openPoId)}
      onClose={() => setOpenPoId(null)}
      mode="edit"
      initialPoId={String(openPoId || "").trim()}
      serviceProposalId={String(editingPo?.serviceProposalId || "").trim()}
      jobNumber={String(editingPo?.jobNumber || "").trim()}
      defaultPoType={
        String(editingPo?.poType || "").trim() || SIMPLE_PO_TYPE_JOB
      }
      allowPoTypeChange={false}
      hideViewJobButton={false}
      listNavigation={vendorPoNavigation}
      zIndex={zIndex + 25}
      onSaved={() => {
        void loadVendorPos();
        onPoSaved?.();
      }}
    />
    </>
  );
}
