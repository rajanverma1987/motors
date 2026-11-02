"use client";

import { useState } from "react";
import { FiPrinter, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useFinancialAccess } from "@/hooks/use-financial-access";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import DocumentPreviewSheet from "@/components/dashboard/document-preview-sheet";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import PoPrintSheetBody from "@/components/dashboard/po-print-sheet-body";
import SendDocumentPreviewModal from "@/components/dashboard/send-document-preview-modal";

/**
 * Simple portal PO print preview with Send To Vendor (Classic sheet).
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   po: object | null,
 *   vendor: object | null,
 *   sendMeta: object | null,
 *   title?: string,
 * }} props
 */
export default function SimplePurchaseOrderPrintPreviewModal({
  open,
  onClose,
  po = null,
  vendor = null,
  sendMeta = null,
  sendBodyExtra = null,
  onSent = null,
  title = "Purchase order print preview",
}) {
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const { canViewFinancials } = useFinancialAccess();
  const [printing, setPrinting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const documentReady = Boolean(po);

  const handlePrint = () => {
    if (!canViewFinancials || !documentReady) return;
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
              Send To Vendor
            </Button>
            {canViewFinancials ? (
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
            ) : null}
          </>
        }
      >
        {!canViewFinancials ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-semibold text-danger">Access Restricted</p>
            <p className="text-xs text-secondary">
              Printing purchase orders is restricted for your employee role.
            </p>
          </div>
        ) : documentReady ? (
          <DocumentPreviewSheet
            documentType="po"
            po={po}
            vendor={vendor}
            accountSettings={accountSettings}
            fmt={fmt}
          />
        ) : (
          <p className="py-8 text-center text-sm text-secondary">Nothing to preview.</p>
        )}
      </Modal>

      {printing && canViewFinancials && po ? (
        <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
          <PoPrintSheetBody po={po} vendor={vendor} settings={accountSettings} fmt={fmt} />
        </DocumentPrintOffscreenPortal>
      ) : null}

      <SendDocumentPreviewModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={
          po?.poNumber ? `Send PO ${po.poNumber} to vendor` : "Send purchase order to vendor"
        }
        documentType="po"
        documentId={null}
        localPo={po}
        localVendor={vendor}
        localSendMeta={sendMeta}
        sendUrl="/api/dashboard/simple-purchase-orders/send"
        sendBodyExtra={{
          documentLabel: po?.poNumber ? `PO ${po.poNumber}` : "Purchase order",
          poNumber: po?.poNumber || "",
          toEmail: sendMeta?.toEmail || "",
          toName: sendMeta?.toName || "",
          po,
          vendor,
          ...(sendBodyExtra && typeof sendBodyExtra === "object" ? sendBodyExtra : {}),
        }}
        onSent={(result) => {
          onSent?.(result);
          setSendOpen(false);
          onClose?.();
        }}
        zIndex={130}
      />
    </>
  );
}
