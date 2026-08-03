"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import { beginPrintLightTheme } from "@/lib/print-light-theme";

const STYLE_ID = "invoice-print-preview-styles";
const PRINT_ROOT_CLASS = "invoice-print-offscreen-root";

function injectInvoicePrintStyles() {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ID)) return () => {};
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      @page {
        size: letter;
        background: #ffffff;
      }
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #111111 !important;
        color-scheme: light !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body > *:not(.${PRINT_ROOT_CLASS}) {
        display: none !important;
      }
      .${PRINT_ROOT_CLASS} {
        display: block !important;
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        opacity: 1 !important;
        background: #ffffff !important;
        color: #111111 !important;
        padding: 0.5in !important;
        z-index: auto !important;
        box-shadow: none !important;
        border: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .${PRINT_ROOT_CLASS} * {
        box-shadow: none !important;
      }
      .${PRINT_ROOT_CLASS} .print-totals-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .${PRINT_ROOT_CLASS} .print-notes-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .${PRINT_ROOT_CLASS} tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
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
  overflow: "visible",
  background: "#ffffff",
  color: "#111111",
  colorScheme: "light",
};

/**
 * Renders printable invoice off-screen and opens the system print dialog only.
 * Always prints as a light document (ignores UI dark mode).
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
    const restoreTheme = beginPrintLightTheme();
    const handleAfterPrint = () => {
      restoreTheme();
      onCloseRef.current?.();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", handleAfterPrint);
      restoreTheme();
    };
  }, [ready]);

  if (!ready || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`${PRINT_ROOT_CLASS} bg-white text-neutral-900`}
      style={OFFSCREEN_STYLE}
      aria-hidden="true"
      data-print-theme="light"
    >
      <InvoicePrintPreview
        invoice={payload.invoice}
        motorLabel={payload.motorLabel}
        fromShopName={payload.fromShopName}
        fromShopContact={payload.fromShopContact}
        fromShopLogoUrl={payload.fromShopLogoUrl}
        fromBillingAddress={payload.fromBillingAddress}
        fromShippingAddress={payload.fromShippingAddress}
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
