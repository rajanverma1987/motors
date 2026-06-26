"use client";

import { useState, useEffect, useRef } from "react";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { useToast } from "@/components/toast-provider";
import Button from "@/components/ui/button";
import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import { fetchQuotePreviewPayload } from "@/lib/document-preview-payload";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE, SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER } from "@/lib/quote-document-labels";

/**
 * Loads quote data, keeps printable markup off-screen, opens the system print dialog only.
 * No full-screen overlay — cleanup runs on afterprint (same pattern as repair-flow flow-quote print).
 * @param {boolean} [standalone] — direct URL: shows loading/error on the page; success path is still off-screen + print.
 */
export default function QuotePrintPreview({ quoteId, open, onClose, standalone = false }) {
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const toast = useToast();
  const [quote, setQuote] = useState(null);
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
      setError(null);
      setLoading(true);
    }
  }, [open, standalone]);

  useEffect(() => {
    if (!active) return;
    if (!quoteId) {
      setLoading(false);
      setError(`${SERVICE_PROPOSAL_DOCUMENT_TITLE} ID required`);
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuote(null);
    (async () => {
      try {
        const data = await fetchQuotePreviewPayload(quoteId, accountSettings);
        if (cancelled) return;
        setQuote(data);
      } catch (e) {
        if (!cancelled) setError(e.message || `Failed to load ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, active, accountSettings?.accountsBillingAddress, accountSettings?.accountsShippingAddress]);

  useEffect(() => {
    if (standalone || !open) return;
    if (loading || !error) return;
    toastRef.current.error(error);
    onCloseRef.current?.();
  }, [standalone, open, loading, error]);

  const ready = active && !loading && !!quote && !error;
  const shouldPrint = ready && (standalone || open);

  const onCloseStableRef = useRef(onClose);
  onCloseStableRef.current = onClose;

  if (!active) return null;

  if (standalone) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-card p-6 text-secondary">
          Loading {SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER}…
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

  if (!shouldPrint || typeof document === "undefined") {
    return null;
  }

  return (
    <DocumentPrintOffscreenPortal open onClose={() => onCloseStableRef.current?.()}>
      <QuotePrintSheetBody quote={quote} fmt={fmt} />
    </DocumentPrintOffscreenPortal>
  );
}
