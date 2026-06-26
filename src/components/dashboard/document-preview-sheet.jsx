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
  return (
    <div className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-border bg-neutral-100 p-4 sm:p-6 shadow-inner">
      <div className="mx-auto w-full max-w-[52.8rem] bg-white p-6 shadow-sm sm:p-8">
        {documentType === "quote" && quote ? <QuotePrintSheetBody quote={quote} fmt={fmt} /> : null}
        {documentType === "invoice" && invoicePayload ? (
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
        ) : null}
        {documentType === "po" && po ? (
          <PoPrintSheetBody po={po} vendor={vendor} settings={accountSettings} fmt={fmt} />
        ) : null}
      </div>
    </div>
  );
}
