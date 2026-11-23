"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiRotateCw, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import HelpIcon from "@/components/ui/help-icon";
import SimpleRichTextEditor from "@/components/admin/simple-rich-text-editor";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import DocumentPreviewSheet from "@/components/dashboard/document-preview-sheet";
import {
  fetchInvoicePreviewPayload,
  fetchPoPreviewPayload,
  fetchQuotePreviewPayload,
} from "@/lib/document-preview-payload";
import {
  SEND_DOCUMENT_CC_MAX_LENGTH,
  SEND_DOCUMENT_TO_EMAIL_MAX,
  isSendToEmail,
} from "@/lib/send-document-custom-message";
import {
  buildDefaultSendDocumentEmailBody,
  mergeSavedEmailBody,
  plainEmailBodyToHtml,
  referenceFromDocumentLabel,
} from "@/lib/send-document-email-body";

const SEND_EMAIL_DRAFT_PREFIX = "motors-send-email-draft:";
const SEND_EMAIL_DRAFT_DEBOUNCE_MS = 400;

function sendEmailDraftKey(documentType, documentId, label) {
  const type = String(documentType || "").trim();
  const id = String(documentId || label || "").trim();
  if (!type || !id) return "";
  return `${SEND_EMAIL_DRAFT_PREFIX}${type}:${id}`;
}

function readSendEmailDraft(key) {
  if (!key || typeof localStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return {
      toEmail: String(parsed.toEmail || ""),
      emailCc: String(parsed.emailCc || ""),
      emailCustomMessage: String(parsed.emailCustomMessage || ""),
    };
  } catch {
    return null;
  }
}

function writeSendEmailDraft(key, draft, baselineTo, baselineMessage) {
  if (!key || typeof localStorage === "undefined" || !draft) return;
  const toEmail = String(draft.toEmail || "");
  const emailCc = String(draft.emailCc || "");
  const emailCustomMessage = String(draft.emailCustomMessage || "");
  const unchanged =
    toEmail.trim() === String(baselineTo || "").trim() &&
    !emailCc.trim() &&
    emailCustomMessage.trim() === String(baselineMessage || "").trim();
  if (unchanged) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(
    key,
    JSON.stringify({ toEmail, emailCc, emailCustomMessage })
  );
}

function clearSendEmailDraft(key) {
  if (!key || typeof localStorage === "undefined") return;
  localStorage.removeItem(key);
}

function sendMetaUrl(documentType, documentId) {
  if (!documentId) return null;
  if (documentType === "quote") return `/api/dashboard/quotes/${documentId}/send/preview`;
  if (documentType === "invoice") return `/api/dashboard/invoices/${documentId}/send/preview`;
  if (documentType === "po") return `/api/dashboard/purchase-orders/${documentId}/send/preview`;
  return null;
}

/**
 * Preview the RFQ / invoice / PO document before emailing it to customer or vendor.
 * Supports Classic documentId fetch OR local payloads (Simple portal).
 */
export default function SendDocumentPreviewModal({
  open,
  onClose,
  title = "Preview before send",
  documentType,
  documentId,
  sendUrl,
  sendMethod = "POST",
  sendBodyExtra = null,
  localQuote = null,
  localInvoicePayload = null,
  localPo = null,
  localVendor = null,
  localSendMeta = null,
  onSent,
  zIndex = 60,
}) {
  const toast = useToast();
  const fmt = useFormatMoney();
  const { isOwner, user } = useAuth();
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
  const [toEmail, setToEmail] = useState("");
  const draftReadyRef = useRef(false);
  const draftAppliedRef = useRef(false);
  const sentRef = useRef(false);
  const baselineToRef = useRef("");
  const baselineMessageRef = useRef("");
  const shopNameRef = useRef("");
  const bodyExtraRef = useRef(sendBodyExtra);
  const draftFieldsRef = useRef({ toEmail: "", emailCc: "", emailCustomMessage: "" });

  shopNameRef.current = String(user?.shopName || "").trim();
  bodyExtraRef.current = sendBodyExtra;

  const useLocalDocument = Boolean(localQuote || localInvoicePayload || localPo);
  const draftLabel = String(
    sendBodyExtra?.documentLabel || sendBodyExtra?.poNumber || localSendMeta?.documentLabel || ""
  ).trim();
  const draftKey = sendEmailDraftKey(documentType, documentId, draftLabel);

  draftFieldsRef.current = { toEmail, emailCc, emailCustomMessage };

  const defaultEmailBody = (meta) => {
    const extra = bodyExtraRef.current && typeof bodyExtraRef.current === "object" ? bodyExtraRef.current : {};
    const documentLabel = String(meta?.documentLabel || extra.documentLabel || "").trim();
    const explicitRef =
      documentType === "po"
        ? String(extra.poNumber || "").trim()
        : documentType === "invoice"
          ? referenceFromDocumentLabel("invoice", documentLabel)
          : referenceFromDocumentLabel("quote", documentLabel);
    return buildDefaultSendDocumentEmailBody({
      documentType,
      attachedPdf: useLocalDocument,
      toName: meta?.toName || extra.toName || "",
      shopName: shopNameRef.current,
      kindLabel: extra.kindLabel || "",
      documentLabel,
      reference: explicitRef || referenceFromDocumentLabel(documentType, documentLabel),
    });
  };

  const applyEmailDraft = (defaultTo, meta) => {
    const baseline = String(defaultTo || "").trim();
    const defaultMessage = defaultEmailBody(meta);
    const defaultHtml = plainEmailBodyToHtml(defaultMessage);
    baselineToRef.current = baseline;
    baselineMessageRef.current = defaultHtml;
    const draft = readSendEmailDraft(draftKey);
    if (draft) {
      setToEmail(draft.toEmail);
      setEmailCc(draft.emailCc);
      setEmailCustomMessage(mergeSavedEmailBody(defaultMessage, draft.emailCustomMessage));
    } else {
      setToEmail(baseline);
      setEmailCc("");
      setEmailCustomMessage(defaultHtml);
    }
    draftReadyRef.current = Boolean(draftKey);
  };

  const flushEmailDraft = () => {
    if (!draftReadyRef.current || sentRef.current) return;
    writeSendEmailDraft(
      draftKey,
      draftFieldsRef.current,
      baselineToRef.current,
      baselineMessageRef.current
    );
  };

  useEffect(() => {
    if (!open || !documentType) {
      if (draftAppliedRef.current) flushEmailDraft();
      draftAppliedRef.current = false;
      draftReadyRef.current = false;
      sentRef.current = false;
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
      setToEmail("");
      return;
    }

    if (useLocalDocument) {
      setLoadError("");
      setLoading(false);
      setSending(false);
      setSendMeta(localSendMeta || null);
      setQuote(localQuote || null);
      setInvoicePayload(localInvoicePayload || null);
      setPo(localPo || null);
      setVendor(localVendor || null);
      if (!draftAppliedRef.current) {
        applyEmailDraft(localSendMeta?.toEmail || "", localSendMeta);
        draftAppliedRef.current = true;
      }
      return;
    }

    if (!documentId) {
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
      setToEmail("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setSendMeta(null);
    setToEmail("");
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
        if (!draftAppliedRef.current) {
          applyEmailDraft(meta?.toEmail || "", meta);
          draftAppliedRef.current = true;
        }

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
    useLocalDocument,
    localQuote,
    localInvoicePayload,
    localPo,
    localVendor,
    localSendMeta,
    accountSettings?.logoUrl,
    accountSettings?.accountsBillingAddress,
    accountSettings?.accountsShippingAddress,
    accountSettings?.accountsPaymentTerms,
    accountSettings?.invoicePaymentOptions,
    accountSettings?.invoiceThankYouNote,
    draftKey,
  ]);

  useEffect(() => {
    if (!open || !draftReadyRef.current || !draftKey || sentRef.current) return undefined;
    const handle = setTimeout(() => {
      if (!draftReadyRef.current || sentRef.current) return;
      writeSendEmailDraft(
        draftKey,
        draftFieldsRef.current,
        baselineToRef.current,
        baselineMessageRef.current
      );
    }, SEND_EMAIL_DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [open, draftKey, toEmail, emailCc, emailCustomMessage]);

  const handleSend = async () => {
    if (!sendUrl) return;
    const nextTo = toEmail.trim();
    if (!isSendToEmail(nextTo)) {
      toast.error("Enter a valid To email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(sendUrl, {
        method: sendMethod,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMessage: emailCustomMessage.trim(),
          cc: emailCc.trim(),
          ...(sendBodyExtra && typeof sendBodyExtra === "object" ? sendBodyExtra : {}),
          toEmail: nextTo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      sentRef.current = true;
      draftReadyRef.current = false;
      clearSendEmailDraft(draftKey);
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
  const toEmailValid = isSendToEmail(toEmail);
  const documentReady =
    (documentType === "quote" && quote) ||
    (documentType === "invoice" && invoicePayload) ||
    (documentType === "po" && po);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="7xl"
      width="min(1800px, 98vw)"
      className="lg:h-[min(90vh,960px)]"
      bodyClassName="lg:overflow-hidden lg:flex lg:flex-col"
      titleClassName="pointer-events-none max-w-[min(40rem,46vw)] truncate text-base font-semibold leading-snug text-title sm:text-lg"
      zIndex={zIndex}
      showClose={!busy}
      closeOnOutsideClick={false}
      actions={
        <>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy || !documentReady || !!loadError || smtpBlocked || !toEmailValid}
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
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(420px,46%)_minmax(0,1fr)] lg:items-stretch">
          <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
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
              {isOwner ? (
                <Link
                  href="/dashboards/settings?section=smtp"
                  className="mt-2 inline-block font-medium underline underline-offset-2"
                  onClick={() => onClose?.()}
                >
                  Open Email Settings
                </Link>
              ) : (
                <p className="mt-2 text-xs opacity-90">
                  Please contact the main shop administrator to configure email settings.
                </p>
              )}
            </div>
          ) : null}

          <Input
            id="send-document-to"
            label="To"
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="email@example.com"
            maxLength={SEND_DOCUMENT_TO_EMAIL_MAX}
            autoComplete="email"
            disabled={busy}
            required
          />

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

          <div className="flex flex-col gap-1">
            <label
              htmlFor="send-document-custom-message"
              className={`inline-flex items-center gap-1.5 text-sm text-title ${busy ? "opacity-70" : ""}`}
            >
              Email body
              <HelpIcon text="Format the message before sending. Bold, italic, lists, and links are kept. The view link or PDF, shop logo, and account details are added automatically." />
            </label>
            <SimpleRichTextEditor
              id="send-document-custom-message"
              value={emailCustomMessage}
              onChange={setEmailCustomMessage}
              disabled={busy}
              minHeight="16rem"
            />
          </div>

          <p className="text-xs text-secondary">
            {smtpBlocked
              ? "Complete workspace SMTP settings before sending."
              : documentType === "po"
                ? useLocalDocument
                  ? "The vendor will receive an email with the purchase order attached as a PDF."
                  : "The vendor will receive an email with a link to view and update delivery status."
                : useLocalDocument
                  ? "The customer will receive an email with this document attached as a PDF."
                  : "The customer will receive an email with a link to view this document."}
          </p>
          </div>

          <DocumentPreviewSheet
            documentType={documentType}
            quote={quote}
            invoicePayload={invoicePayload}
            po={po}
            vendor={vendor}
            accountSettings={accountSettings}
            fmt={fmt}
            frameClassName="h-full max-h-[min(60vh,640px)] lg:max-h-full"
          />
        </div>
      ) : null}
    </Modal>
  );
}
