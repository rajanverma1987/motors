"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

const STYLE_ID = "document-print-offscreen-styles";
const PRINT_ROOT_CLASS = "document-print-offscreen-root";

function injectDocumentPrintStyles() {
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
 * Off-screen print portal — opens the system print dialog only (no full-screen overlay).
 */
export default function DocumentPrintOffscreenPortal({ open, onClose, children }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return injectDocumentPrintStyles();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
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
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`${PRINT_ROOT_CLASS} bg-white text-title`} style={OFFSCREEN_STYLE} aria-hidden="true">
      {children}
    </div>,
    document.body
  );
}
