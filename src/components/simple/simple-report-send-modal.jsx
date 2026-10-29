"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRotateCw, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Checkbox from "@/components/ui/checkbox";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import {
  SEND_DOCUMENT_CUSTOM_MESSAGE_MAX,
  SEND_DOCUMENT_CC_MAX_LENGTH,
  SEND_DOCUMENT_TO_EMAIL_MAX,
  isSendToEmail,
} from "@/lib/send-document-custom-message";

/**
 * Send Invoices / AR report to a customer as a formatted HTML email (with grand totals).
 * By default only invoices that have a PO are included.
 */
export default function SimpleReportSendModal({
  open,
  onClose,
  reportTitle = "Invoices / AR",
  defaultToEmail = "",
  defaultToName = "",
  customerId = "",
  /** Returns { report, from, to, filters } for the POST body. */
  getSendBody,
  zIndex,
}) {
  const toast = useToast();
  const { user } = useAuth();
  const isOwner = !user?.isEmployee;

  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [includeWithoutPo, setIncludeWithoutPo] = useState(false);
  const [sendMeta, setSendMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadMeta = async ({ withoutPo = includeWithoutPo } = {}) => {
    if (typeof getSendBody !== "function") return;
    const base = getSendBody() || {};
    const filters = base.filters && typeof base.filters === "object" ? base.filters : {};
    const params = new URLSearchParams({ report: "invoices-ar" });
    if (base.from) params.set("from", String(base.from));
    if (base.to) params.set("to", String(base.to));
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, String(value));
    }
    const cid = customerId || String(filters.customer || "").trim();
    if (cid) params.set("customer", cid);
    if (defaultToEmail) params.set("toEmail", String(defaultToEmail).trim());
    if (withoutPo) params.set("includeWithoutPo", "1");

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/simple-reports/send?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load send details");
      setSendMeta(data.preview || null);
      if (data.preview?.toEmail && !String(defaultToEmail || "").trim()) {
        setToEmail(String(data.preview.toEmail).trim());
      }
      if (data.preview?.toName && !String(defaultToName || "").trim()) {
        setToName(String(data.preview.toName).trim());
      }
    } catch (err) {
      toast.error(err.message || "Could not load send details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setToEmail(String(defaultToEmail || "").trim());
    setToName(String(defaultToName || "").trim());
    setEmailCc("");
    setEmailCustomMessage("");
    setIncludeWithoutPo(false);
    setSendMeta(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset fields when dialog opens
  }, [open, customerId, defaultToEmail, defaultToName]);

  useEffect(() => {
    if (!open) return;
    void loadMeta({ withoutPo: includeWithoutPo });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh count when toggle / open changes
  }, [open, includeWithoutPo, customerId, defaultToEmail, defaultToName]);

  const handleSend = async () => {
    const targetEmail = toEmail.trim();
    if (!isSendToEmail(targetEmail)) {
      toast.error("Enter a valid customer email.");
      return;
    }
    if (typeof getSendBody !== "function") {
      toast.error("Missing report context.");
      return;
    }
    setSending(true);
    try {
      const base = getSendBody() || {};
      const res = await fetch("/api/dashboard/simple-reports/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...base,
          report: "invoices-ar",
          toEmail: targetEmail,
          toName: toName.trim(),
          cc: emailCc,
          customMessage: emailCustomMessage,
          includeWithoutPo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send report");
      toast.success(data.message || `Report sent to ${targetEmail}.`);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Could not send report email");
    } finally {
      setSending(false);
    }
  };

  const busy = loading || sending;
  const smtpBlocked = sendMeta?.smtp?.canSend === false;
  const toEmailValid = isSendToEmail(toEmail);
  const invoiceCount = Number(sendMeta?.rowCount);
  const hasInvoices = Number.isFinite(invoiceCount) && invoiceCount > 0;

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title="Send to customer"
      size="lg"
      width="min(520px, 96vw)"
      zIndex={zIndex}
      showClose={!busy}
      closeOnOutsideClick={false}
      actions={
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busy || smtpBlocked || !toEmailValid || !hasInvoices}
          className="inline-flex items-center gap-1.5"
          onClick={() => void handleSend()}
        >
          {sending ? (
            <FiRotateCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <FiSend className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {sending ? "Sending…" : "Send report"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-secondary">
          Email <span className="font-medium text-title">{reportTitle}</span> to the customer.
        </p>

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

        {sendMeta?.from ? (
          <p className="text-xs text-secondary">
            From: <span className="font-medium text-title">{sendMeta.from}</span>
          </p>
        ) : null}

        <Input
          id="send-report-to"
          label="To (customer email)"
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="customer@example.com"
          maxLength={SEND_DOCUMENT_TO_EMAIL_MAX}
          autoComplete="email"
          disabled={busy}
          required
          help={toName ? `Recipient: ${toName}` : "Select a customer filter first, or type an email."}
        />
        <Input
          id="send-report-cc"
          label="Cc (optional)"
          type="text"
          value={emailCc}
          onChange={(e) => setEmailCc(e.target.value)}
          placeholder="manager@example.com"
          maxLength={SEND_DOCUMENT_CC_MAX_LENGTH}
          disabled={busy}
          help="Separate multiple addresses with a comma."
        />
        <Textarea
          id="send-report-message"
          label="Message for email (optional)"
          value={emailCustomMessage}
          onChange={(e) => setEmailCustomMessage(e.target.value)}
          placeholder="Add a short note included above the invoice list…"
          rows={4}
          maxLength={SEND_DOCUMENT_CUSTOM_MESSAGE_MAX}
          disabled={busy}
        />

        <Checkbox
          name="includeWithoutPo"
          checked={includeWithoutPo}
          disabled={busy}
          onChange={(e) => setIncludeWithoutPo(Boolean(e.target.checked))}
          label="Include invoices without PO"
          help="Off by default: only invoices that have a PO are emailed."
        />

        <p className="text-xs text-secondary">
          {loading
            ? "Counting invoices…"
            : hasInvoices
              ? `${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"} will be included.`
              : includeWithoutPo
                ? "No invoices match this report."
                : "No invoices with a PO match this report."}
        </p>
      </div>
    </Modal>
  );
}
