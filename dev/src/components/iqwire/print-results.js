"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

const STYLE_ID = "iqwire-cm-print-styles";
const PRINT_ROOT_CLASS = "iqwire-cm-print-root";

function injectPrintStyles() {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ID)) return () => {};
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: landscape; margin: 6mm; background: #ffffff; }
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #111111 !important;
      }
      body > *:not(.${PRINT_ROOT_CLASS}) { display: none !important; }
      .${PRINT_ROOT_CLASS} {
        display: block !important;
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        height: auto !important;
        opacity: 1 !important;
        background: #ffffff !important;
        color: #111111 !important;
        padding: 0.2in !important;
        z-index: auto !important;
      }
      .${PRINT_ROOT_CLASS} tr { break-inside: avoid; }
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
  width: "11in",
  maxWidth: "100vw",
  opacity: 0,
  pointerEvents: "none",
  zIndex: -1,
  overflow: "visible",
  background: "#ffffff",
  color: "#111111",
};

export default function IqwirePrintResults({ open, onClose, children }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return injectPrintStyles();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const handleAfterPrint = () => onCloseRef.current?.();
    window.addEventListener("afterprint", handleAfterPrint);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) window.print();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`${PRINT_ROOT_CLASS} bg-white text-neutral-900`} style={OFFSCREEN_STYLE} aria-hidden="true">
      {children}
    </div>,
    document.body
  );
}

export function CmPrintSheet({ title, results, resultContext, generatedLabel }) {
  if (!resultContext || !results?.length) return null;
  return (
    <div className="text-neutral-900">
      <h1 className="mb-1 text-lg font-bold">{title || "CM Best Match"}</h1>
      <p className="mb-4 text-xs text-neutral-600">
        Generated {generatedLabel || ""} · {results.length} match{results.length === 1 ? "" : "es"}
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3 border border-neutral-300 p-3 text-sm">
        <div>
          <div className="text-xs text-neutral-600">Original Wires in Hand</div>
          <div className="font-semibold">{resultContext.originalWiredInHand}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600">Original Wire Size</div>
          <div className="font-semibold">{resultContext.originalWireSize}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600">Original CM</div>
          <div className="font-semibold">{resultContext.originalCMDisplay}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600">Targeted CM</div>
          <div className="font-semibold">{resultContext.targetedCM}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600">Desired Min Wires</div>
          <div className="font-semibold">{resultContext.minWires}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-600">Desired Max Wires</div>
          <div className="font-semibold">{resultContext.maxWires}</div>
        </div>
        {resultContext.selectedCatalogSummary ? (
          <div className="col-span-3">
            <div className="text-xs text-neutral-600">Catalog sizes used in search</div>
            <div className="font-semibold">{resultContext.selectedCatalogSummary}</div>
          </div>
        ) : null}
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-neutral-800 text-white">
            {[
              "Wire Size",
              "# Wires",
              "Wire Size 2",
              "# Wires 2",
              "Wire Size 3",
              "# Wires 3",
              "Total CM",
              "Targeted CM",
              "Wires In Hand",
              "% Difference",
              "CM Difference",
            ].map((h) => (
              <th key={h} className="border border-neutral-400 px-1.5 py-1 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => (
            <tr key={idx} className={Math.abs(Number(row.percentDifference) || 0) <= 2 ? "bg-emerald-100" : Math.abs(Number(row.percentDifference) || 0) <= 5 ? "bg-amber-100" : ""}>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wires1 > 0 ? row.wireSize1 : 0}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wires1 > 0 ? row.wires1 : 0}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wires2 > 0 ? row.wireSize2 : 0}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wires2 > 0 ? row.wires2 : 0}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wires3 > 0 ? row.wireSize3 : 0}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wires3 > 0 ? row.wires3 : 0}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.totalCM}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.targetedCM}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.wiresInHand}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.percentDifference}</td>
              <td className="border border-neutral-300 px-1.5 py-1">{row.cmDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
