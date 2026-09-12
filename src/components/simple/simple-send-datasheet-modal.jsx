"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRotateCw, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import SimpleDatasheetPrintSheet from "@/components/simple/simple-datasheet-print-sheet";
import {
  SEND_DOCUMENT_CUSTOM_MESSAGE_MAX,
  SEND_DOCUMENT_CC_MAX_LENGTH,
  SEND_DOCUMENT_TO_EMAIL_MAX,
  isSendToEmail,
} from "@/lib/send-document-custom-message";

/**
 * Modal to preview and email the AC / DC motor inspection report & datasheet to customer.
 * Dispatches via the shop's workspace SMTP.
 */
export default function SimpleSendDatasheetModal({
  open,
  onClose,
  motorType = "AC",
  datasheet = null,
  printContext = null,
  technicianLabel = "",
  jobDiagrams = [],
  attachments = [],
  onSent,
  zIndex = 70,
}) {
  const toast = useToast();
  const { isOwner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMeta, setSendMeta] = useState(null);
  const [toEmail, setToEmail] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");

  const isDc = String(motorType || "AC").toUpperCase() === "DC";
  const docNumber = String(printContext?.documentNumber || datasheet?.jobNumber || "").trim();
  const customerName = String(printContext?.customerName || printContext?.companyName || datasheet?.company || "").trim();
  const defaultTo = String(printContext?.customerEmail || "").trim();

  useEffect(() => {
    if (!open) {
      setSendMeta(null);
      setSending(false);
      setLoading(false);
      return;
    }

    setToEmail(defaultTo);
    setEmailCc("");
    setEmailCustomMessage("");

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      toEmail: defaultTo,
      toName: customerName,
      motorType: isDc ? "DC" : "AC",
      documentLabel: `${isDc ? "DC" : "AC"} Motor Datasheet and Inspection Report`,
    });

    fetch(`/api/dashboard/simple-service-proposals/datasheet/send?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) {
          setSendMeta(data.preview);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, defaultTo, customerName, isDc]);

  const handleSend = async () => {
    const targetEmail = toEmail.trim();
    if (!isSendToEmail(targetEmail)) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/dashboard/simple-service-proposals/datasheet/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: targetEmail,
          toName: customerName,
          cc: emailCc.trim(),
          customMessage: emailCustomMessage.trim(),
          motorType: isDc ? "DC" : "AC",
          datasheet,
          printContext,
          technicianLabel,
          jobDiagrams,
          attachments,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send datasheet email");
      }

      toast.success(data.message || "Datasheet report sent to customer.");
      onSent?.(data);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Email ${isDc ? "DC" : "AC"} Report to Customer`}
      size="6xl"
      width="min(980px, 96vw)"
      zIndex={zIndex}
      showClose={!busy}
      closeOnOutsideClick={false}
      actions={
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busy || smtpBlocked || !toEmailValid}
          className="inline-flex items-center gap-1.5"
          onClick={handleSend}
        >
          {sending ? (
            <FiRotateCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <FiSend className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {sending ? "Sending…" : "Send Report"}
        </Button>
      }
    >
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

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id="send-datasheet-to"
            label="To (customer email)"
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="customer@example.com"
            maxLength={SEND_DOCUMENT_TO_EMAIL_MAX}
            autoComplete="email"
            disabled={busy}
            required
            help={customerName ? `Recipient: ${customerName}` : undefined}
          />

          <Input
            id="send-datasheet-cc"
            label="Cc (optional)"
            type="text"
            value={emailCc}
            onChange={(e) => setEmailCc(e.target.value)}
            placeholder="manager@example.com, tech@example.com"
            maxLength={SEND_DOCUMENT_CC_MAX_LENGTH}
            disabled={busy}
            help="Separate multiple email addresses with a comma."
          />
        </div>

        <Textarea
          id="send-datasheet-message"
          label="Message for email (optional)"
          value={emailCustomMessage}
          onChange={(e) => setEmailCustomMessage(e.target.value)}
          placeholder="Add a personal note or summary included with the attached PDF report…"
          rows={3}
          maxLength={SEND_DOCUMENT_CUSTOM_MESSAGE_MAX}
          disabled={busy}
          textareaClassName="min-h-[4.5rem]"
        />

        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-secondary">
            <span>Report attachment preview</span>
            {docNumber ? <span>Job: {docNumber}</span> : null}
          </div>

          <div className="max-h-[min(56vh,540px)] overflow-auto rounded-lg border border-border bg-neutral-100 p-3 sm:p-5 shadow-inner">
            <div className="mx-auto w-full max-w-[50rem] bg-white p-4 shadow-sm sm:p-6 text-black">
              <SimpleDatasheetPrintSheet
                motorType={isDc ? "DC" : "AC"}
                datasheet={datasheet}
                printContext={printContext || {}}
                technicianLabel={technicianLabel}
                jobDiagrams={jobDiagrams}
                attachments={attachments}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
