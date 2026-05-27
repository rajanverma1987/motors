"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/toast-provider";
import WorkOrderPrintSheetBody from "@/components/dashboard/work-order-print-sheet-body";

const STYLE_ID = "work-order-print-preview-styles";
const PRINT_ROOT_CLASS = "work-order-print-offscreen-root";

function injectWorkOrderPrintStyles() {
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
        padding: 1rem !important;
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
 * Loads work order data, keeps printable markup off-screen, opens the system print dialog only.
 */
export default function WorkOrderPrintPreview({ workOrderId, open, onClose }) {
  const toast = useToast();
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toastRef = useRef(toast);
  toastRef.current = toast;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setWorkOrder(null);
      setError(null);
      setLoading(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!workOrderId) {
      setLoading(false);
      setError("Work order ID required");
      setWorkOrder(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setWorkOrder(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/work-orders/${workOrderId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Work order not found");
          return;
        }
        setWorkOrder(data);
      } catch {
        if (!cancelled) setError("Failed to load work order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workOrderId, open]);

  useEffect(() => {
    if (!open) return;
    return injectWorkOrderPrintStyles();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (loading || !error) return;
    toastRef.current.error(error);
    onCloseRef.current?.();
  }, [open, loading, error]);

  const ready = open && !loading && !!workOrder && !error;

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
      <WorkOrderPrintSheetBody workOrder={workOrder} />
    </div>,
    document.body
  );
}
