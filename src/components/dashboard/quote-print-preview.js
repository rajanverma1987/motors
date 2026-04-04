"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { useToast } from "@/components/toast-provider";
import Button from "@/components/ui/button";
import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";

const STYLE_ID = "quote-print-preview-styles";
const PRINT_ROOT_CLASS = "quote-print-offscreen-root";

function injectQuotePrintStyles() {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ID)) return () => {};
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      .${PRINT_ROOT_CLASS},
      .${PRINT_ROOT_CLASS} * { visibility: visible !important; }
      .${PRINT_ROOT_CLASS} {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100% !important;
        overflow: visible !important;
        opacity: 1 !important;
        background: white !important;
        z-index: 2147483647 !important;
        padding: 1.5rem !important;
      }
    }
  `;
  document.head.appendChild(style);
  return () => {
    document.getElementById(STYLE_ID)?.remove();
  };
}

const OFFSCREEN_STYLE = {
  position: "fixed",
  left: "-100vw",
  top: 0,
  width: "8.5in",
  maxWidth: "100vw",
  opacity: 0,
  pointerEvents: "none",
  zIndex: -1,
  overflow: "hidden",
};

/**
 * Loads quote data, keeps printable markup off-screen, opens the system print dialog only.
 * No full-screen overlay — cleanup runs on afterprint (same pattern as repair-flow flow-quote print).
 * @param {boolean} [standalone] — direct URL: shows loading/error on the page; success path is still off-screen + print.
 */
export default function QuotePrintPreview({ quoteId, open, onClose, standalone = false }) {
  const fmt = useFormatMoney();
  const toast = useToast();
  const { settings: accountSettings } = useUserSettings();
  const [quote, setQuote] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [motorLabel, setMotorLabel] = useState("");
  const [preparedByName, setPreparedByName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const active = standalone || open;
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (standalone) return;
    if (!open) {
      setQuote(null);
      setCustomerName("");
      setMotorLabel("");
      setPreparedByName("");
      setError(null);
      setLoading(true);
    }
  }, [open, standalone]);

  useEffect(() => {
    if (!active) return;
    if (!quoteId) {
      setLoading(false);
      setError("Quote ID required");
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuote(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/quotes/${quoteId}`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Quote not found");
          return;
        }
        setQuote(data);
        if (data.customerId) {
          const custRes = await fetch(`/api/dashboard/customers/${data.customerId}`, { credentials: "include" });
          if (custRes.ok) {
            const cust = await custRes.json();
            if (!cancelled) setCustomerName(cust.companyName || cust.primaryContactName || "");
          }
        }
        if (data.motorId) {
          const motorRes = await fetch(`/api/dashboard/motors`, { credentials: "include" });
          if (motorRes.ok) {
            const motors = await motorRes.json();
            const m = (Array.isArray(motors) ? motors : []).find((x) => x.id === data.motorId);
            if (m && !cancelled) {
              setMotorLabel([m.serialNumber, m.manufacturer, m.model].filter(Boolean).join(" · ") || m.id);
            }
          }
        }
        if (data.preparedBy != null && String(data.preparedBy).trim() !== "") {
          const empRes = await fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" });
          if (empRes.ok) {
            const emps = await empRes.json();
            const list = Array.isArray(emps) ? emps : [];
            const match = list.find((e) => String(e.id) === String(data.preparedBy));
            if (!cancelled) setPreparedByName(match?.name || "");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load quote");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, active]);

  useEffect(() => {
    if (!active) return;
    return injectQuotePrintStyles();
  }, [active]);

  /** In-page print: no overlay — surface errors with toast and close. */
  useEffect(() => {
    if (standalone || !open) return;
    if (loading || !error) return;
    toastRef.current.error(error);
    onCloseRef.current?.();
  }, [standalone, open, loading, error]);

  const ready = active && !loading && !!quote && !error;

  const onCloseStableRef = useRef(onClose);
  onCloseStableRef.current = onClose;

  useLayoutEffect(() => {
    if (!ready) return;
    const handleAfterPrint = () => {
      onCloseStableRef.current?.();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [ready]);

  if (!active) return null;

  if (standalone) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-card p-6 text-secondary">
          Loading quote…
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-card p-6">
          <p className="text-danger">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => onClose?.()}>
            Close
          </Button>
        </div>
      );
    }
  }

  if (!ready || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`${PRINT_ROOT_CLASS} bg-white text-title`}
      style={OFFSCREEN_STYLE}
      aria-hidden="true"
    >
      <div className="mx-auto max-w-3xl text-sm">
        <QuotePrintSheetBody
          quote={quote}
          customerName={customerName}
          motorLabel={motorLabel}
          preparedByName={preparedByName}
          fmt={fmt}
          accountSettings={accountSettings}
        />
      </div>
    </div>,
    document.body
  );
}
