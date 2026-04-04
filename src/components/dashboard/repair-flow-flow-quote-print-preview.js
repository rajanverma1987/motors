"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { useToast } from "@/components/toast-provider";
import RepairFlowFlowQuotePrintContent from "@/components/dashboard/repair-flow-flow-quote-print-content";

/**
 * Loads flow-quote data with no visible overlay, then opens the browser print dialog (system print preview).
 * Printable markup stays off-screen until @media print.
 */
export default function RepairFlowFlowQuotePrintPreview({ open, jobId, onClose, onPrepareStateChange }) {
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const onCloseRef = useRef(onClose);
  const onPrepareRef = useRef(onPrepareStateChange);
  useEffect(() => {
    onCloseRef.current = onClose;
    onPrepareRef.current = onPrepareStateChange;
  });

  const [job, setJob] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !jobId) {
      onPrepareRef.current?.(false);
      setJob(null);
      setQuotes([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    onPrepareRef.current?.(true);
    setLoading(true);
    setJob(null);
    setQuotes([]);
    (async () => {
      try {
        const [jobRes, qRes] = await Promise.all([
          fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/dashboard/repair-flow/jobs/${jobId}/flow-quotes`, { credentials: "include", cache: "no-store" }),
        ]);
        const jobData = await jobRes.json().catch(() => ({}));
        const quotesData = await qRes.json().catch(() => []);
        if (cancelled) return;
        if (!jobRes.ok) {
          toastRef.current.error(jobData.error || "Job not found");
          onPrepareRef.current?.(false);
          onCloseRef.current?.();
          return;
        }
        const j = jobData.job;
        const list = Array.isArray(quotesData) ? quotesData : [];
        if (list.length === 0) {
          toastRef.current.error("No repair flow quotes have been created for this job yet.");
          onPrepareRef.current?.(false);
          onCloseRef.current?.();
          return;
        }
        setJob(j);
        setQuotes(list);
      } catch {
        if (!cancelled) {
          toastRef.current.error("Failed to load");
          onPrepareRef.current?.(false);
          onCloseRef.current?.();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          onPrepareRef.current?.(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  useEffect(() => {
    if (!open) return;
    const styleId = "repair-flow-quote-print-preview-styles";
    const existing = document.getElementById(styleId);
    if (existing) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .repair-flow-quote-print-root,
        .repair-flow-quote-print-root * { visibility: visible; }
        .repair-flow-quote-print-root {
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
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [open]);

  const ready = open && !loading && job && quotes.length > 0;

  const onCloseStableRef = useRef(onClose);
  onCloseStableRef.current = onClose;

  useLayoutEffect(() => {
    if (!ready) return;
    const handleAfterPrint = () => {
      onCloseStableRef.current();
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

  if (!ready || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="repair-flow-quote-print-root bg-white text-title"
      style={{
        position: "fixed",
        left: "-100vw",
        top: 0,
        width: "8.5in",
        maxWidth: "100vw",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <div className="mx-auto max-w-3xl text-sm">
        <RepairFlowFlowQuotePrintContent job={job} quotes={quotes} fmt={fmt} accountSettings={accountSettings} />
      </div>
    </div>,
    document.body
  );
}
