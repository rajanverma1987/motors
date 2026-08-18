"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiRotateCw, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import { useFormatDate } from "@/contexts/user-settings-context";
import { SEND_DOCUMENT_CUSTOM_MESSAGE_MAX, SEND_DOCUMENT_CC_MAX_LENGTH } from "@/lib/send-document-custom-message";

function DetailRow({ label, value }) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return (
    <div className="flex min-w-0 gap-2 text-sm">
      <span className="w-28 shrink-0 text-secondary">{label}</span>
      <span className="min-w-0 break-words font-medium text-title">{v}</span>
    </div>
  );
}

/**
 * Send Motor Shipping details to the customer.
 */
export default function SimpleMotorShippingSendModal({
  open,
  onClose,
  entry = null,
  sendMeta = null,
  paidByLabel = "",
  zIndex = 140,
  onSent,
}) {
  const toast = useToast();
  const formatDate = useFormatDate();
  const [sending, setSending] = useState(false);
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [emailCc, setEmailCc] = useState("");

  useEffect(() => {
    if (!open) {
      setSending(false);
      setEmailCustomMessage("");
      setEmailCc("");
    }
  }, [open]);

  const smtpBlocked = sendMeta?.smtp?.canSend === false;
  const canSend = Boolean(entry && sendMeta?.toEmail && !smtpBlocked);

  const handleSend = async () => {
    if (!canSend || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/dashboard/simple-motor-shipping/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toEmail: sendMeta.toEmail,
          toName: sendMeta.toName || "",
          documentLabel: sendMeta.documentLabel || "Motor shipping",
          customMessage: emailCustomMessage,
          cc: emailCc,
          entry: {
            ...entry,
            paidByLabel: paidByLabel || entry?.paidBy || "",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.message || "Email sent.");
      onSent?.(data);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Could not send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (sending) return;
        onClose?.();
      }}
      title="Send to"
      size="lg"
      width="min(560px, 96vw)"
      zIndex={zIndex}
      showClose={!sending}
      closeOnOutsideClick={false}
      actions={
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canSend || sending}
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
      }
    >
      {!sendMeta?.toEmail ? (
        <p className="py-6 text-center text-sm text-danger">
          Customer has no email address. Add an email on the service proposal or customer record.
        </p>
      ) : (
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
                href="/dashboards/settings?section=smtp"
                className="mt-2 inline-block font-medium underline underline-offset-2"
                onClick={() => onClose?.()}
              >
                Open Email Settings
              </Link>
            </div>
          ) : null}

          <p className="text-sm text-secondary">
            <span className="font-medium text-foreground">Email to: </span>
            {sendMeta.toName ? `${sendMeta.toName} <${sendMeta.toEmail}>` : sendMeta.toEmail}
          </p>

          <Input
            id="motor-shipping-send-cc"
            label="Cc (optional)"
            type="text"
            value={emailCc}
            onChange={(e) => setEmailCc(e.target.value)}
            placeholder="email@example.com; other@example.com"
            maxLength={SEND_DOCUMENT_CC_MAX_LENGTH}
            disabled={sending}
            help="Separate multiple addresses with a comma or semicolon."
          />

          <Textarea
            id="motor-shipping-send-message"
            label="Message for email (optional)"
            value={emailCustomMessage}
            onChange={(e) => setEmailCustomMessage(e.target.value)}
            placeholder="Add a personal note included in the email body…"
            rows={3}
            maxLength={SEND_DOCUMENT_CUSTOM_MESSAGE_MAX}
            disabled={sending}
            textareaClassName="min-h-[5rem]"
          />

          <div className="rounded-sm border border-border bg-card p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">Shipping details</p>
            <div className="flex flex-col gap-1.5">
              <DetailRow label="Invoice #" value={entry?.invoiceNumber} />
              <DetailRow label="PO Number" value={entry?.shippingPo} />
              <DetailRow label="Date" value={entry?.date ? formatDate(entry.date) : ""} />
              <DetailRow label="Transport" value={entry?.mannerOfTransport} />
              <DetailRow label="Freight" value={entry?.freight} />
              <DetailRow label="Picked by" value={entry?.pickedBy} />
              <DetailRow label="Charges" value={entry?.charges} />
              <DetailRow label="Paid By" value={paidByLabel || entry?.paidBy} />
              <DetailRow label="Notes" value={entry?.notes} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
