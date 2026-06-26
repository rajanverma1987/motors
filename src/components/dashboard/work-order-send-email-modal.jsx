"use client";

import { useState, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import WorkOrderPrintSheetBody from "@/components/dashboard/work-order-print-sheet-body";

async function fetchWorkOrderPreview(workOrderId) {
  const [woRes, inspRes] = await Promise.all([
    fetch(`/api/dashboard/work-orders/${workOrderId}`, {
      credentials: "include",
      cache: "no-store",
    }),
    fetch(`/api/dashboard/work-orders/${workOrderId}/inspections`, {
      credentials: "include",
      cache: "no-store",
    }),
  ]);
  const data = await woRes.json();
  if (!woRes.ok) throw new Error(data.error || "Work order not found");
  const inspData = await inspRes.json().catch(() => []);
  return {
    workOrder: data,
    inspections: inspRes.ok && Array.isArray(inspData) ? inspData : [],
  };
}

/**
 * Preview work order + email recipient before sending PDF attachment.
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
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [workOrder, setWorkOrder] = useState(null);
  const [inspections, setInspections] = useState([]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setInstructions("");
      setBusy(false);
      setLoading(false);
      setLoadError("");
      setWorkOrder(null);
      setInspections([]);
      return;
    }

    setEmail(String(defaultEmail || "").trim());
    setInstructions("");
    setBusy(false);
    setLoadError("");
    setWorkOrder(null);
    setInspections([]);

    if (!workOrderId) {
      setLoadError("Work order ID required");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const payload = await fetchWorkOrderPreview(workOrderId);
        if (!cancelled) {
          setWorkOrder(payload.workOrder);
          setInspections(payload.inspections);
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
  }, [open, workOrderId, defaultEmail]);

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

  const previewReady = !loading && !loadError && !!workOrder;

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
            disabled={busy || loading || !previewReady || !!loadError}
            className="inline-flex items-center gap-1.5"
            onClick={handleSend}
          >
            <FiSend className="h-4 w-4 shrink-0" aria-hidden />
            {busy ? "Sending…" : "Send"}
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
          <span className="text-sm text-secondary">Loading work order preview…</span>
        </div>
      ) : loadError ? (
        <p className="py-8 text-center text-sm text-danger">{loadError}</p>
      ) : previewReady ? (
        <div className="flex flex-col gap-4">
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
            rows={3}
            maxLength={4000}
            disabled={busy}
            textareaClassName="min-h-[4.5rem] text-sm"
          />

          <div className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-border bg-neutral-100 p-4 sm:p-6 shadow-inner">
            <div className="mx-auto w-full max-w-[52.8rem] bg-white p-6 shadow-sm sm:p-8">
              <WorkOrderPrintSheetBody workOrder={workOrder} inspections={inspections} />
            </div>
          </div>

          <p className="text-xs text-secondary">
            Review the work order above. A PDF will be attached to the email.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
