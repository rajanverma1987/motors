"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import { poLineHasContent, canCancelPoLine } from "@/lib/simple-purchase-order-form";

const FORM_ID = "simple-po-cancel-lines-form";

/**
 * Cancel PO line items (with optional vendor notification when PO was already sent).
 */
export default function SimplePoLineCancellationModal({
  open,
  onClose,
  poNumber = "",
  lines = [],
  initialLineIds = [],
  busy = false,
  onSubmit,
}) {
  const eligible = useMemo(
    () =>
      (Array.isArray(lines) ? lines : []).filter(
        (line) => poLineHasContent(line) && canCancelPoLine(line)
      ),
    [lines]
  );

  const [selected, setSelected] = useState(() => new Set());
  const [reason, setReason] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [notifyVendor, setNotifyVendor] = useState(true);

  useEffect(() => {
    if (!open) return;
    const ids = new Set(
      (Array.isArray(initialLineIds) ? initialLineIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    );
    if (!ids.size && eligible.length) {
      eligible.forEach((line) => ids.add(String(line.id)));
    }
    setSelected(ids);
    setReason("");
    setCustomMessage("");
    setNotifyVendor(true);
  }, [open, initialLineIds, eligible]);

  const allSelected = eligible.length > 0 && selected.size === eligible.length;

  const toggleLine = (lineId) => {
    const id = String(lineId || "").trim();
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected.size) return;
    onSubmit?.({
      lineIds: [...selected],
      reason: reason.trim(),
      customMessage: customMessage.trim(),
      notifyVendor,
      entirePo: allSelected,
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title={allSelected ? "Cancel entire purchase order" : "Cancel purchase order items"}
      size="lg"
      zIndex={170}
      showClose={!busy}
      actions={
        <Button
          type="submit"
          form={FORM_ID}
          variant="primary"
          size="sm"
          disabled={busy || !selected.size}
        >
          {busy
            ? "Saving…"
            : allSelected
              ? "Cancel entire PO"
              : "Cancel selected items"}
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary">
          {poNumber
            ? `Select line items to cancel on PO# ${poNumber}. Cancelled items stay on the purchase order with strikethrough styling.`
            : "Select line items to cancel. Cancelled items stay on the purchase order with strikethrough styling."}
        </p>

        {eligible.length === 0 ? (
          <p className="text-sm text-secondary">No active line items with status Ordered can be cancelled.</p>
        ) : (
          <ul className="flex flex-col gap-2 rounded border border-border bg-form-bg p-3">
            {eligible.map((line) => {
              const id = String(line.id || "");
              const checked = selected.has(id);
              return (
                <li key={id} className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleLine(id)}
                    disabled={busy}
                    aria-label={`Cancel ${line.itemName || "line"}`}
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-title">{line.itemName || "—"}</p>
                    <p className="text-secondary tabular-nums">
                      Qty {line.quantity ?? "0"}
                      {line.uom ? ` · ${line.uom}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Textarea
          label="Reason for cancellation"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Required for vendor notification and internal record…"
          disabled={busy}
        />

        <Textarea
          label="Message to vendor (optional)"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={3}
          placeholder="Additional note included in the cancellation email…"
          disabled={busy}
        />

        <Checkbox
          checked={notifyVendor}
          onChange={(e) => setNotifyVendor(e.target.checked)}
          disabled={busy}
          label="Notify vendor by email"
        />
      </form>
    </Modal>
  );
}
