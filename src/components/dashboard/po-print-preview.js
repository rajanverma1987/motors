"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { useToast } from "@/components/toast-provider";
import PoPrintSheetBody from "@/components/dashboard/po-print-sheet-body";

const STYLE_ID = "po-print-preview-styles";
const PRINT_ROOT_CLASS = "po-print-offscreen-root";

function injectPoPrintStyles() {
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
 * Loads PO + vendor (+ RFQ label for job POs), keeps markup off-screen, opens system print dialog.
 */
export default function PoPrintPreview({ purchaseOrderId, open, onClose }) {
  const fmt = useFormatMoney();
  const toast = useToast();
  const { settings } = useUserSettings();
  const [po, setPo] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [rfqNumber, setRfqNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toastRef = useRef(toast);
  toastRef.current = toast;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setPo(null);
      setVendor(null);
      setRfqNumber("");
      setError(null);
      setLoading(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!purchaseOrderId) {
      setLoading(false);
      setError("Purchase order ID required");
      setPo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPo(null);
    setVendor(null);
    setRfqNumber("");
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${purchaseOrderId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Purchase order not found");
          return;
        }
        setPo(data);

        const vid = String(data.vendorId || "").trim();
        if (vid) {
          const vRes = await fetch(`/api/dashboard/vendors/${vid}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (vRes.ok && !cancelled) {
            const v = await vRes.json();
            setVendor(v);
          }
        }

        if (data.type === "job" && String(data.quoteId || "").trim()) {
          const qRes = await fetch(`/api/dashboard/quotes/${encodeURIComponent(data.quoteId)}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (qRes.ok && !cancelled) {
            const q = await qRes.json();
            setRfqNumber(String(q.rfqNumber || "").trim());
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load purchase order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId, open]);

  useEffect(() => {
    if (!open) return;
    return injectPoPrintStyles();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (loading || !error) return;
    toastRef.current.error(error);
    onCloseRef.current?.();
  }, [open, loading, error]);

  const ready = open && !loading && !!po && !error;

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

  if (!open) return null;

  if (!ready || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`${PRINT_ROOT_CLASS} bg-white text-title`}
      style={OFFSCREEN_STYLE}
      aria-hidden="true"
    >
      <PoPrintSheetBody po={po} vendor={vendor} rfqNumber={rfqNumber} settings={settings} fmt={fmt} />
    </div>,
    document.body
  );
}
