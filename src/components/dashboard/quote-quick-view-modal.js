"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

function statusVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return "default";
  if (/\b(approved|complete|completed|paid|delivered|closed)\b/i.test(s)) return "success";
  if (/\b(cancel|canceled|cancelled|rejected|void)\b/i.test(s)) return "danger";
  if (/\b(pending|sent|waiting|hold|review)\b/i.test(s)) return "warning";
  return "primary";
}

export default function QuoteQuickViewModal({ open, quoteId, onClose, zIndex = 90 }) {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    if (!open) {
      setQuote(null);
      setLoading(false);
      return;
    }
    if (!quoteId) return;
    let cancelled = false;
    setLoading(true);
    setQuote(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/quotes/${quoteId}`, { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load quote");
        setQuote(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.message || "Failed to load quote");
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, quoteId, toast, onClose]);

  const total = useMemo(() => {
    const q = quote || {};
    const n = Number(q.laborTotal || 0) + Number(q.partsTotal || 0);
    return Number.isFinite(n) ? n : 0;
  }, [quote]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={quote?.rfqNumber ? `RFQ ${quote.rfqNumber}` : "RFQ"}
      width="min(980px, 96vw)"
      zIndex={zIndex}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <p className="py-6 text-center text-secondary">Loading…</p>
      ) : quote ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Customer</p>
                <p className="mt-1 truncate text-lg font-semibold text-title">{quote.customerName || "—"}</p>
                {quote.motorLabel ? <p className="mt-1 truncate text-sm text-secondary">{quote.motorLabel}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-secondary">Date</p>
                <p className="mt-0.5 text-sm font-medium text-title">{quote.date || "—"}</p>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <Badge variant={statusVariant(quote.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                    {quote.status || "—"}
                  </Badge>
                  <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                    Total: {fmt(total)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Scope</h3>
              {Array.isArray(quote.scopeLines) && quote.scopeLines.length ? (
                <ul className="mt-2 space-y-1.5 text-sm text-text">
                  {quote.scopeLines.slice(0, 12).map((row, i) => (
                    <li key={i} className="whitespace-pre-wrap">
                      {row?.scope || "—"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-secondary">—</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-title">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{quote.notes || "—"}</p>
            </div>
          </div>

          {quote.workOrderId ? (
            <p className="text-xs text-secondary">
              Linked work order: <span className="font-medium text-title">{quote.workOrderId}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

