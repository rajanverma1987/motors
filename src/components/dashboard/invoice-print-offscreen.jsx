"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";

const STYLE_ID = "invoice-print-preview-styles";
const PRINT_ROOT_CLASS = "invoice-print-offscreen-root";

function injectInvoicePrintStyles() {
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
 * Renders printable invoice off-screen and opens the system print dialog only.
 * Matches .cursorrules / quote-print-preview: no full-screen overlay; cleanup on afterprint.
 *
 * @param {boolean} open
 * @param {object|null} payload — same shape as invoice modal / list print payload
 * @param {() => void} [onClose] — after print dialog closes (afterprint)
 */
export default function InvoicePrintOffscreen({ open, payload, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return injectInvoicePrintStyles();
  }, [open]);

  const ready = open && !!payload;

  useLayoutEffect(() => {
    if (!ready) return;
    const handleAfterPrint = () => {
      onCloseRef.current?.();
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

  if (!ready || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`${PRINT_ROOT_CLASS} bg-white text-title`}
      style={OFFSCREEN_STYLE}
      aria-hidden="true"
    >
      <InvoicePrintPreview
        invoice={payload.invoice}
        motorLabel={payload.motorLabel}
        fromShopName={payload.fromShopName}
        fromShopContact={payload.fromShopContact}
        fromShopLogoUrl={payload.fromShopLogoUrl}
        fromBillingAddress={payload.fromBillingAddress}
        fromPaymentTermsLabel={payload.fromPaymentTermsLabel}
        customerToName={payload.customerToName}
        customerBillingAddress={payload.customerBillingAddress}
        invoicePaymentOptions={payload.invoicePaymentOptions}
        invoiceThankYouNote={payload.invoiceThankYouNote}
      />
    </div>,
    document.body
  );
}
