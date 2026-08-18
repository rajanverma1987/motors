"use client";

import { useMemo, useState } from "react";
import { FiPrinter, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import DocumentPreviewSheet from "@/components/dashboard/document-preview-sheet";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import SendDocumentPreviewModal from "@/components/dashboard/send-document-preview-modal";
import { PRINT_NOTES_CUSTOMER } from "@/lib/simple-service-proposal-print";

/**
 * Simple portal print preview (Classic RFQ / Invoice sheet) with Send To Customer.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   bundle: object | null,
 *   sendMeta: object | null,
 *   title?: string,
 * }} props
 */
export default function SimpleServiceProposalPrintPreviewModal({
  open,
  onClose,
  bundle,
  sendMeta = null,
  title = "Print preview",
}) {
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const [printing, setPrinting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const documentType = bundle?.documentType || "quote";
  const quote = bundle?.quote || null;
  const invoicePayload = bundle?.invoicePayload || null;
  const documentReady =
    (documentType === "quote" && quote) || (documentType === "invoice" && invoicePayload);

  const customerBundle = useMemo(() => {
    if (!bundle) return null;
    if (bundle.printNotesMode === PRINT_NOTES_CUSTOMER) return bundle;
    // Send always uses customer notes version of the sheet.
    if (documentType === "quote" && quote) {
      return {
        ...bundle,
        printNotesMode: PRINT_NOTES_CUSTOMER,
        quote: { ...quote, printNotesMode: PRINT_NOTES_CUSTOMER },
      };
    }
    if (documentType === "invoice" && invoicePayload) {
      return {
        ...bundle,
        printNotesMode: PRINT_NOTES_CUSTOMER,
        invoicePayload: {
          ...invoicePayload,
          printNotesMode: PRINT_NOTES_CUSTOMER,
          invoice: { ...(invoicePayload.invoice || {}), printNotesMode: PRINT_NOTES_CUSTOMER },
        },
      };
    }
    return bundle;
  }, [bundle, documentType, quote, invoicePayload]);

  const handlePrint = () => {
    if (!documentReady) return;
    setPrinting(true);
  };

  const handlePrintDone = () => {
    setPrinting(false);
    onClose?.();
  };

  return (
    <>
      <Modal
        open={open && !printing && !sendOpen}
        onClose={onClose}
        title={title}
        size="6xl"
        width="min(960px, 96vw)"
        closeOnOutsideClick={false}
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!documentReady}
              className="inline-flex items-center gap-1.5"
              onClick={() => setSendOpen(true)}
            >
              <FiSend className="h-4 w-4 shrink-0" aria-hidden />
              Send To Customer
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!documentReady}
              className="inline-flex items-center gap-1.5"
              onClick={handlePrint}
            >
              <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
              Print
            </Button>
          </>
        }
      >
        {documentReady ? (
          <DocumentPreviewSheet
            documentType={documentType}
            quote={quote}
            invoicePayload={invoicePayload}
            accountSettings={accountSettings}
            fmt={fmt}
          />
        ) : (
          <p className="py-8 text-center text-sm text-secondary">Nothing to preview.</p>
        )}
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
            logoDocumentScale={invoicePayload.logoDocumentScale}
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

      <SendDocumentPreviewModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send to customer"
        documentType={customerBundle?.documentType || documentType}
        documentId={null}
        localQuote={customerBundle?.quote || null}
        localInvoicePayload={customerBundle?.invoicePayload || null}
        localSendMeta={sendMeta}
        sendUrl="/api/dashboard/simple-service-proposals/send"
        sendBodyExtra={{
          documentType: customerBundle?.documentType || documentType,
          documentLabel: customerBundle?.documentLabel || "",
          toEmail: sendMeta?.toEmail || "",
          toName: sendMeta?.toName || "",
        }}
        onSent={() => {
          setSendOpen(false);
          onClose?.();
        }}
      />
    </>
  );
}
