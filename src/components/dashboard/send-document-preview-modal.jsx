"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRotateCw, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import DocumentPreviewSheet from "@/components/dashboard/document-preview-sheet";
import {
  fetchInvoicePreviewPayload,
  fetchPoPreviewPayload,
  fetchQuotePreviewPayload,
} from "@/lib/document-preview-payload";
import { SEND_DOCUMENT_CUSTOM_MESSAGE_MAX, SEND_DOCUMENT_CC_MAX_LENGTH } from "@/lib/send-document-custom-message";

function sendMetaUrl(documentType, documentId) {
  if (!documentId) return null;
  if (documentType === "quote") return `/api/dashboard/quotes/${documentId}/send/preview`;
  if (documentType === "invoice") return `/api/dashboard/invoices/${documentId}/send/preview`;
  if (documentType === "po") return `/api/dashboard/purchase-orders/${documentId}/send/preview`;
  return null;
}

/**
 * Preview the RFQ / invoice / PO document before emailing it to customer or vendor.
 */
export default function SendDocumentPreviewModal({
  open,
  onClose,
  title = "Preview before send",
  documentType,
  documentId,
  sendUrl,
  sendMethod = "POST",
  onSent,
  zIndex = 60,
}) {
  const toast = useToast();
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sendMeta, setSendMeta] = useState(null);
  const [quote, setQuote] = useState(null);
  const [invoicePayload, setInvoicePayload] = useState(null);
  const [po, setPo] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [emailCc, setEmailCc] = useState("");

  useEffect(() => {
    if (!open || !documentId || !documentType) {
      setLoadError("");
      setLoading(false);
      setSending(false);
      setSendMeta(null);
      setQuote(null);
      setInvoicePayload(null);
      setPo(null);
      setVendor(null);
      setEmailCustomMessage("");
      setEmailCc("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setSendMeta(null);
    setQuote(null);
    setInvoicePayload(null);
    setPo(null);
    setVendor(null);

    const metaUrl = sendMetaUrl(documentType, documentId);

    (async () => {
      try {
        const fetches = [
          fetch(metaUrl, { credentials: "include" }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to load send details");
            return data.preview || null;
          }),
        ];

        if (documentType === "quote") {
          fetches.push(fetchQuotePreviewPayload(documentId, accountSettings));
        } else if (documentType === "invoice") {
          fetches.push(fetchInvoicePreviewPayload(documentId, accountSettings));
        } else if (documentType === "po") {
          fetches.push(fetchPoPreviewPayload(documentId));
        }

        const results = await Promise.all(fetches);
        if (cancelled) return;

        const meta = results[0];
        setSendMeta(meta);

        if (documentType === "quote") {
          setQuote(results[1]);
        } else if (documentType === "invoice") {
          setInvoicePayload(results[1]);
        } else if (documentType === "po") {
          const { po: poData, vendor: vendorData } = results[1];
          setPo(poData);
          setVendor(vendorData);
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

  const handleSend = async () => {
    if (!sendUrl) return;
    setSending(true);
    try {
      const res = await fetch(sendUrl, {
        method: sendMethod,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMessage: emailCustomMessage.trim(),
          cc: emailCc.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.message || "Email sent.");
      onSent?.(data);
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Could not send email");
    } finally {
      setSending(false);
    }
  };

  const busy = loading || sending;
  const smtpBlocked = sendMeta?.smtp?.canSend === false;
  const documentReady =
    (documentType === "quote" && quote) ||
    (documentType === "invoice" && invoicePayload) ||
    (documentType === "po" && po);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="6xl"
      width="min(960px, 96vw)"
      zIndex={zIndex}
      showClose={!busy}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy || !documentReady || !!loadError || smtpBlocked}
            className="inline-flex items-center gap-1.5"
            onClick={handleSend}
          >
            {sending ? (
              <FiRotateCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <FiSend className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {sending ? "Sending…" : "Send"}
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
        <div className="flex flex-col gap-4">
          {sendMeta?.smtp?.message ? (
            <div
              className={
                sendMeta.smtp.status === "incomplete"
                  ? "rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                  : "rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
              }
              role="status"
            >
              <p>{sendMeta.smtp.message}</p>
              <Link
                href="/dashboard/settings"
                className="mt-2 inline-block font-medium underline underline-offset-2"
                onClick={() => onClose?.()}
              >
                Open SMTP settings
              </Link>
            </div>
          ) : null}

          {sendMeta?.toEmail ? (
            <p className="text-sm text-secondary">
              <span className="font-medium text-foreground">Email to: </span>
              {sendMeta.toName ? `${sendMeta.toName} <${sendMeta.toEmail}>` : sendMeta.toEmail}
            </p>
          ) : null}

          <Input
            id="send-document-cc"
            label="Cc (optional)"
            type="text"
            value={emailCc}
            onChange={(e) => setEmailCc(e.target.value)}
            placeholder="email@example.com; other@example.com"
            maxLength={SEND_DOCUMENT_CC_MAX_LENGTH}
            disabled={busy}
            help="Separate multiple addresses with a comma or semicolon."
          />

          <Textarea
            id="send-document-custom-message"
            label="Message for email (optional)"
            value={emailCustomMessage}
            onChange={(e) => setEmailCustomMessage(e.target.value)}
            placeholder="Add a personal note included in the email body above the document link…"
            rows={3}
            maxLength={SEND_DOCUMENT_CUSTOM_MESSAGE_MAX}
            disabled={busy}
            textareaClassName="min-h-[5rem]"
          />

          <DocumentPreviewSheet
            documentType={documentType}
            quote={quote}
            invoicePayload={invoicePayload}
            po={po}
            vendor={vendor}
            accountSettings={accountSettings}
            fmt={fmt}
          />

          <p className="text-xs text-secondary">
            {smtpBlocked
              ? "Complete workspace SMTP settings before sending."
              : documentType === "po"
                ? "Review the purchase order above. The vendor will receive an email with a link to view and update delivery status."
                : "Review the document above. The customer will receive an email with a link to view it."}
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
