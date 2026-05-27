"use client";

import { useState, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";

/**
 * Ask for recipient email + optional instructions, then email work order PDF.
 */
export default function WorkOrderSendEmailModal({
  open,
  onClose,
  workOrderId,
  workOrderNumber,
  defaultEmail = "",
  zIndex = 60,
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(String(defaultEmail || "").trim());
    setInstructions("");
    setBusy(false);
  }, [open, defaultEmail]);

  const handleSend = async () => {
    const to = email.trim();
    if (!to) {
      toast.error("Enter an email address.");
      return;
    }
    if (!workOrderId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${workOrderId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: to,
          instructions: instructions.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.message || "Work order sent.");
      onClose();
    } catch (e) {
      toast.error(e.message || "Could not send work order");
    } finally {
      setBusy(false);
    }
  };

  const title = workOrderNumber
    ? `Send work order ${workOrderNumber}`
    : "Send work order";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
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
            disabled={busy}
            className="inline-flex items-center gap-1.5"
            onClick={handleSend}
          >
            <FiSend className="h-4 w-4 shrink-0" aria-hidden />
            {busy ? "Sending…" : "Send"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          autoComplete="email"
          disabled={busy}
        />
        <Textarea
          label="Instructions (optional)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Add a short note for the recipient…"
          rows={4}
          maxLength={4000}
          disabled={busy}
          textareaClassName="min-h-[5rem] text-sm"
        />
        <p className="text-xs text-secondary">
          A PDF of this work order will be attached to the email.
        </p>
      </div>
    </Modal>
  );
}
