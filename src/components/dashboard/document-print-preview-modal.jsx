"use client";

import { useEffect, useState } from "react";
import { FiPrinter } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import DocumentPreviewSheet from "@/components/dashboard/document-preview-sheet";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import PoPrintSheetBody from "@/components/dashboard/po-print-sheet-body";
import {
  fetchInvoicePreviewPayload,
  fetchPoPreviewPayload,
  fetchQuotePreviewPayload,
} from "@/lib/document-preview-payload";

/**
 * Print preview modal — same on-screen document as send-document-preview-modal, then system print dialog.
 */
export default function DocumentPrintPreviewModal({
  open,
  onClose,
  title = "Print preview",
  documentType,
  documentId,
  zIndex = 60,
}) {
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [quote, setQuote] = useState(null);
  const [invoicePayload, setInvoicePayload] = useState(null);
  const [po, setPo] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open || !documentId || !documentType) {
      setLoadError("");
      setLoading(false);
      setQuote(null);
      setInvoicePayload(null);
      setPo(null);
      setVendor(null);
      setPrinting(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setQuote(null);
    setInvoicePayload(null);
    setPo(null);
    setVendor(null);

    (async () => {
      try {
        if (documentType === "quote") {
          const payload = await fetchQuotePreviewPayload(documentId, accountSettings);
          if (!cancelled) setQuote(payload);
        } else if (documentType === "invoice") {
          const payload = await fetchInvoicePreviewPayload(documentId, accountSettings);
          if (!cancelled) setInvoicePayload(payload);
        } else if (documentType === "po") {
          const { po: poData, vendor: vendorData } = await fetchPoPreviewPayload(documentId);
          if (!cancelled) {
            setPo(poData);
            setVendor(vendorData);
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "Failed to load preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    documentType,
    documentId,
    accountSettings?.logoUrl,
    accountSettings?.accountsBillingAddress,
    accountSettings?.accountsShippingAddress,
    accountSettings?.accountsPaymentTerms,
    accountSettings?.invoicePaymentOptions,
    accountSettings?.invoiceThankYouNote,
  ]);

  const documentReady =
    (documentType === "quote" && quote) ||
    (documentType === "invoice" && invoicePayload) ||
    (documentType === "po" && po);

  const handlePrint = () => {
    if (!documentReady || loadError) return;
    setPrinting(true);
  };

  const handlePrintDone = () => {
    setPrinting(false);
    onClose?.();
  };

  return (
    <>
      <Modal
        open={open && !printing}
        onClose={onClose}
        title={title}
        size="6xl"
        width="min(960px, 96vw)"
        zIndex={zIndex}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={loading || !documentReady || !!loadError}
              className="inline-flex items-center gap-1.5"
              onClick={handlePrint}
            >
              <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
              Print
            </Button>
          </>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <span
              className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
              aria-hidden
            />
            <span className="text-sm text-secondary">Loading document preview…</span>
          </div>
        ) : loadError ? (
          <p className="py-8 text-center text-sm text-danger">{loadError}</p>
        ) : documentReady ? (
          <DocumentPreviewSheet
            documentType={documentType}
            quote={quote}
            invoicePayload={invoicePayload}
            po={po}
            vendor={vendor}
            accountSettings={accountSettings}
            fmt={fmt}
          />
        ) : null}
      </Modal>

      {printing && documentType === "quote" && quote ? (
        <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
          <QuotePrintSheetBody quote={quote} fmt={fmt} />
        </DocumentPrintOffscreenPortal>
      ) : null}

      {printing && documentType === "invoice" && invoicePayload ? (
        <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
          <InvoicePrintPreview
            invoice={invoicePayload.invoice}
            motorLabel={invoicePayload.motorLabel}
            fromShopName={invoicePayload.fromShopName}
            fromShopContact={invoicePayload.fromShopContact}
            fromShopLogoUrl={invoicePayload.fromShopLogoUrl}
            fromBillingAddress={invoicePayload.fromBillingAddress}
            fromShippingAddress={invoicePayload.fromShippingAddress}
            fromPaymentTermsLabel={invoicePayload.fromPaymentTermsLabel}
            customerToName={invoicePayload.customerToName}
            customerBillingAddress={invoicePayload.customerBillingAddress}
            invoicePaymentOptions={invoicePayload.invoicePaymentOptions}
            invoiceThankYouNote={invoicePayload.invoiceThankYouNote}
            fmt={fmt}
          />
        </DocumentPrintOffscreenPortal>
      ) : null}

      {printing && documentType === "po" && po ? (
        <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
          <PoPrintSheetBody po={po} vendor={vendor} settings={accountSettings} fmt={fmt} />
        </DocumentPrintOffscreenPortal>
      ) : null}
    </>
  );
}
