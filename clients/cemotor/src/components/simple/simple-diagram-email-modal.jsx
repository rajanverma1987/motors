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
import {
  SEND_DOCUMENT_CUSTOM_MESSAGE_MAX,
  SEND_DOCUMENT_CC_MAX_LENGTH,
  SEND_DOCUMENT_TO_EMAIL_MAX,
  isSendToEmail,
} from "@/lib/send-document-custom-message";

/**
 * Email a saved job diagram PNG to a recipient via shop SMTP.
 */
export default function SimpleDiagramEmailModal({
  open,
  onClose,
  recordId = "",
  diagram = null,
  defaultToEmail = "",
  defaultToName = "",
  zIndex,
  onSent,
}) {
  const toast = useToast();
  const { isOwner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMeta, setSendMeta] = useState(null);
  const [toEmail, setToEmail] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");

  const diagramId = String(diagram?.id || "").trim();
  const diagramLabel = String(diagram?.name || "Job diagram").trim() || "Job diagram";
  const defaultTo = String(defaultToEmail || "").trim();
  const toName = String(defaultToName || "").trim();

  useEffect(() => {
    if (!open) {
      setSendMeta(null);
      setSending(false);
      setLoading(false);
      setToEmail("");
      setEmailCc("");
      setEmailCustomMessage("");
      return;
    }

    setToEmail(defaultTo);
    setEmailCc("");
    setEmailCustomMessage("");

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      toEmail: defaultTo,
      toName,
      documentLabel: diagramLabel,
    });

    fetch(
      `/api/dashboard/simple-service-proposals/${encodeURIComponent(recordId)}/diagrams/${encodeURIComponent(diagramId)}/send?${params.toString()}`,
      { credentials: "include" }
    )
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
  }, [open, defaultTo, toName, diagramLabel, recordId, diagramId]);

  const smtpBlocked = sendMeta?.smtp?.canSend === false;
  const toEmailValid = isSendToEmail(toEmail);
  const canSend = Boolean(recordId && diagramId && toEmailValid && !smtpBlocked && !loading);

  const handleSend = async () => {
    if (!canSend || sending) return;
    const nextTo = toEmail.trim();
    if (!isSendToEmail(nextTo)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `/api/dashboard/simple-service-proposals/${encodeURIComponent(recordId)}/diagrams/${encodeURIComponent(diagramId)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            toEmail: nextTo,
            toName,
            customMessage: emailCustomMessage.trim(),
            cc: emailCc,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.message || "Diagram emailed.");
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
      title="Email diagram"
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
          onClick={() => void handleSend()}
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
      {!diagramId || !recordId ? (
        <p className="py-6 text-center text-sm text-danger">Diagram is missing.</p>
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

          <p className="text-sm text-secondary">
            Attachment: <span className="font-medium text-title">{diagramLabel}</span> (PNG)
          </p>

          <Input
            id="diagram-email-to"
            label="To"
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="email@example.com"
            maxLength={SEND_DOCUMENT_TO_EMAIL_MAX}
            autoComplete="email"
            disabled={sending}
            required
          />

          <Input
            id="diagram-email-cc"
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
            id="diagram-email-message"
            label="Message (optional)"
            value={emailCustomMessage}
            onChange={(e) => setEmailCustomMessage(e.target.value)}
            placeholder="Add a note included in the email body…"
            rows={4}
            maxLength={SEND_DOCUMENT_CUSTOM_MESSAGE_MAX}
            disabled={sending}
            textareaClassName="min-h-[5rem]"
          />
        </div>
      )}
    </Modal>
  );
}
