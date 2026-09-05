"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { beginPrintLightTheme } from "@/lib/print-light-theme";

const STYLE_ID = "document-print-offscreen-styles";
const PRINT_ROOT_CLASS = "document-print-offscreen-root";

function injectDocumentPrintStyles() {
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
      /* Hide app chrome; keep normal document flow for real multi-page breaks */
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
      /* Datasheet: pull content higher so letter page can hold full field grid + signatures */
      .${PRINT_ROOT_CLASS}:has(.datasheet-print-root) {
        padding: 0.28in 0.45in 0.32in !important;
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
      .${PRINT_ROOT_CLASS} .datasheet-diagram-print-page {
        break-before: page !important;
        page-break-before: always !important;
      }
      .${PRINT_ROOT_CLASS} .datasheet-diagram-print-image {
        max-width: 100% !important;
        max-height: 8.6in !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
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

function waitForPrintImages(root, timeoutMs = 5000) {
  if (!root) return Promise.resolve();
  const imgs = Array.from(root.querySelectorAll("img"));
  if (!imgs.length) return Promise.resolve();
  const loadOne = (img) => {
    if (img.complete && img.naturalWidth > 0) {
      return typeof img.decode === "function" ? img.decode().catch(() => {}) : Promise.resolve();
    }
    return new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  };
  return Promise.race([
    Promise.all(imgs.map(loadOne)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Off-screen print portal — opens the system print dialog only (no full-screen overlay).
 * Always prints as a light document (ignores UI dark mode).
 * Waits briefly for images (e.g. job diagrams) before calling window.print().
 */
export default function DocumentPrintOffscreenPortal({ open, onClose, children }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    return injectDocumentPrintStyles();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const restoreTheme = beginPrintLightTheme();
    let cancelled = false;
    const handleAfterPrint = () => {
      restoreTheme();
      onCloseRef.current?.();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void (async () => {
          await waitForPrintImages(rootRef.current);
          if (cancelled) return;
          window.print();
        })();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", handleAfterPrint);
      restoreTheme();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className={`${PRINT_ROOT_CLASS} bg-white text-neutral-900`}
      style={OFFSCREEN_STYLE}
      aria-hidden="true"
      data-print-theme="light"
    >
      {children}
    </div>,
    document.body
  );
}
