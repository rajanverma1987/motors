"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import SimpleSelect from "@/components/simple/simple-select";
import Textarea from "@/components/ui/textarea";
import {
  buildPoReturnPaidByOptions,
  canReturnPoLine,
  poLineHasContent,
  sanitizePoNumericInput,
} from "@/lib/simple-purchase-order-form";

const FORM_ID = "simple-po-return-line-form";

/**
 * Return received PO line items to the vendor.
 */
export default function SimplePoLineReturnModal({
  open,
  onClose,
  poNumber = "",
  lines = [],
  initialLineIds = [],
  vendorName = "",
  companyName = "",
  busy = false,
  onSubmit,
}) {
  const paidByOptions = useMemo(
    () => buildPoReturnPaidByOptions(vendorName, companyName),
    [vendorName, companyName]
  );

  const eligible = useMemo(
    () =>
      (Array.isArray(lines) ? lines : []).filter(
        (line) => poLineHasContent(line) && canReturnPoLine(line)
      ),
    [lines]
  );

  const [selected, setSelected] = useState(() => new Set());
  const [returnTrackingNumber, setReturnTrackingNumber] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnShippingCharge, setReturnShippingCharge] = useState("");
  const [returnPaidBy, setReturnPaidBy] = useState("Vendor");

  useEffect(() => {
    if (!open) return;
    const ids = new Set(
      (Array.isArray(initialLineIds) ? initialLineIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    );
    if (!ids.size && eligible.length === 1) {
      eligible.forEach((line) => ids.add(String(line.id)));
    }
    setSelected(ids);
    setReturnTrackingNumber("");
    setReturnReason("");
    setReturnShippingCharge("");
    setReturnPaidBy("Vendor");
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
      returnTrackingNumber: returnTrackingNumber.trim(),
      returnReason: returnReason.trim(),
      returnShippingCharge: returnShippingCharge.trim(),
      returnPaidBy,
      returnAllReceived: allSelected,
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title={allSelected ? "Return all received items" : "Return items to vendor"}
      size="lg"
      zIndex={170}
      showClose={!busy}
      actions={
        <Button
          type="submit"
          form={FORM_ID}
          variant="primary"
          size="sm"
          disabled={busy || !selected.size || !returnReason.trim()}
        >
          {busy
            ? "Saving…"
            : allSelected
              ? "Return all received items"
              : "Return selected items"}
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary">
          {poNumber
            ? `Select received line items to return on PO# ${poNumber}. Returned items stay on the purchase order with strikethrough styling.`
            : "Select received line items to return. Returned items stay on the purchase order with strikethrough styling."}
        </p>

        {eligible.length === 0 ? (
          <p className="text-sm text-secondary">
            No received items can be returned. Only items with status Received or Partially Received are eligible.
          </p>
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
                    aria-label={`Return ${line.itemName || "line"}`}
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-title">{line.itemName || "—"}</p>
                    <p className="text-secondary tabular-nums">
                      Ordered {line.quantity ?? "0"}
                      {line.uom ? ` ${line.uom}` : ""}
                      {" · "}
                      Received {line.receivedQty ?? "0"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Input
          label="Return tracking number"
          value={returnTrackingNumber}
          onChange={(e) => setReturnTrackingNumber(e.target.value)}
          placeholder="Carrier tracking #"
          disabled={busy}
          autoComplete="off"
        />

        <Textarea
          label="Reason for return"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          rows={3}
          placeholder="Required — why these items are being returned…"
          disabled={busy}
        />

        <Input
          label="Return shipping charge"
          value={returnShippingCharge}
          onChange={(e) => setReturnShippingCharge(sanitizePoNumericInput(e.target.value))}
          inputMode="decimal"
          placeholder="0.00"
          disabled={busy}
          autoComplete="off"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-title">Return shipping paid by</label>
          <SimpleSelect
            options={paidByOptions}
            value={returnPaidBy}
            onChange={(e) => setReturnPaidBy(e.target.value)}
            disabled={busy}
            aria-label="Return shipping paid by"
          />
        </div>
      </form>
    </Modal>
  );
}
