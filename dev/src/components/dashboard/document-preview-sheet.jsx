"use client";

import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import PoPrintSheetBody from "@/components/dashboard/po-print-sheet-body";

/**
 * On-screen document preview frame — same layout as send-document-preview-modal.
 */
export default function DocumentPreviewSheet({
  documentType,
  quote,
  invoicePayload,
  po,
  vendor,
  accountSettings,
  fmt,
}) {
  const quoteForSheet = quote
    ? { ...quote, printNotesMode: quote.printNotesMode || "customer" }
    : null;
  const invoiceForSheet = invoicePayload
    ? {
        ...invoicePayload,
        invoice: {
          ...(invoicePayload.invoice || {}),
          printNotesMode:
            invoicePayload.printNotesMode ||
            invoicePayload.invoice?.printNotesMode ||
            "customer",
        },
      }
    : null;

  return (
    <div className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-border bg-neutral-100 p-4 sm:p-6 shadow-inner">
      <div className="mx-auto w-full max-w-[52.8rem] bg-white p-6 shadow-sm sm:p-8">
        {documentType === "quote" && quoteForSheet ? <QuotePrintSheetBody quote={quoteForSheet} fmt={fmt} /> : null}
        {documentType === "invoice" && invoiceForSheet ? (
          <InvoicePrintPreview
            invoice={invoiceForSheet.invoice}
            motorLabel={invoiceForSheet.motorLabel}
            fromShopName={invoiceForSheet.fromShopName}
            fromShopContact={invoiceForSheet.fromShopContact}
            fromShopLogoUrl={invoiceForSheet.fromShopLogoUrl}
            logoDocumentScale={invoiceForSheet.logoDocumentScale}
            fromBillingAddress={invoiceForSheet.fromBillingAddress}
            fromShippingAddress={invoiceForSheet.fromShippingAddress}
            fromPaymentTermsLabel={invoiceForSheet.fromPaymentTermsLabel}
            customerToName={invoiceForSheet.customerToName}
            customerBillingAddress={invoiceForSheet.customerBillingAddress}
            invoicePaymentOptions={invoiceForSheet.invoicePaymentOptions}
            invoiceThankYouNote={invoiceForSheet.invoiceThankYouNote}
            fmt={fmt}
          />
        ) : null}
        {documentType === "po" && po ? (
          <PoPrintSheetBody po={po} vendor={vendor} settings={accountSettings} fmt={fmt} />
        ) : null}
      </div>
    </div>
  );
}
