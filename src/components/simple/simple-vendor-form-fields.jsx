"use client";

import { FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold";

function FieldRow({ label, labelWidth = "6.75rem", children, className = "", controlClassName = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={`min-w-0 ${controlClassName || "flex-1"}`}>{children}</div>
    </div>
  );
}

/**
 * Dense Access-like vendor fields for Simple portal.
 */
export default function SimpleVendorFormFields({ form, setForm, disabled = false }) {
  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const parts = Array.isArray(form.partsSupplied) ? form.partsSupplied : [];

  const addPart = () => {
    setForm((f) => ({
      ...f,
      partsSupplied: [...(Array.isArray(f.partsSupplied) ? f.partsSupplied : []), ""],
    }));
  };

  const updatePart = (index, value) => {
    setForm((f) => {
      const next = [...(Array.isArray(f.partsSupplied) ? f.partsSupplied : [])];
      if (index < 0 || index >= next.length) return f;
      next[index] = value;
      return { ...f, partsSupplied: next };
    });
  };

  const removePart = (index) => {
    setForm((f) => ({
      ...f,
      partsSupplied: (Array.isArray(f.partsSupplied) ? f.partsSupplied : []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <p className={SECTION_TITLE}>Vendor & contact</p>
        <FieldRow label="Name">
          <input
            type="text"
            required
            disabled={disabled}
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            className={FIELD_INPUT}
            aria-label="Vendor name"
          />
        </FieldRow>
        <FieldRow label="Contact">
          <input
            type="text"
            disabled={disabled}
            value={form.contactName}
            onChange={(e) => patch("contactName", e.target.value)}
            className={FIELD_INPUT}
            aria-label="Contact name"
          />
        </FieldRow>
        <FieldRow label="Phone">
          <input
            type="tel"
            disabled={disabled}
            value={form.phone}
            onChange={(e) => patch("phone", e.target.value)}
            className={FIELD_INPUT}
          />
        </FieldRow>
        <FieldRow label="Email">
          <input
            type="email"
            disabled={disabled}
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
            className={FIELD_INPUT}
          />
        </FieldRow>
        <FieldRow label="Terms">
          <input
            type="text"
            disabled={disabled}
            value={form.paymentTerms}
            onChange={(e) => patch("paymentTerms", e.target.value)}
            className={FIELD_INPUT}
            aria-label="Payment terms"
            placeholder="Net 30"
          />
        </FieldRow>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className={SECTION_TITLE}>Address</p>
        <FieldRow label="Street">
          <input
            type="text"
            disabled={disabled}
            value={form.address}
            onChange={(e) => patch("address", e.target.value)}
            className={FIELD_INPUT}
          />
        </FieldRow>
        <div className="flex min-w-0 items-center gap-2">
          <label className={FIELD_LABEL} style={{ width: "6.75rem" }}>
            City
          </label>
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.1fr)_auto_minmax(0,5rem)] items-center gap-x-1.5">
            <input
              type="text"
              disabled={disabled}
              value={form.city}
              onChange={(e) => patch("city", e.target.value)}
              className={`${FIELD_INPUT} !w-full`}
              aria-label="City"
            />
            <label className="shrink-0 text-xs font-bold text-title">State</label>
            <input
              type="text"
              disabled={disabled}
              value={form.state}
              onChange={(e) => patch("state", e.target.value)}
              className={`${FIELD_INPUT} !w-full`}
              aria-label="State"
            />
            <label className="shrink-0 text-xs font-bold text-title">Zip</label>
            <input
              type="text"
              disabled={disabled}
              value={form.zipCode}
              onChange={(e) => patch("zipCode", e.target.value)}
              className={`${FIELD_INPUT} !w-full`}
              aria-label="Zip"
            />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className={`${SECTION_TITLE} mb-0`}>Parts supplied</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TOOLBAR_BTN}
            disabled={disabled}
            onClick={addPart}
          >
            <FiPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Add part
          </Button>
        </div>
        {parts.length === 0 ? (
          <p className="text-xs text-secondary">No parts listed.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-primary/[0.06] dark:bg-primary/10">
                  <th className="w-10 pl-[5px] pr-1 py-1" />
                  <th className="pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    Part / material
                  </th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className="pl-[5px] pr-1 py-1 align-middle">
                      <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-danger hover:bg-danger/10 disabled:opacity-50"
                        title="Remove part"
                        aria-label="Remove part"
                        onClick={() => removePart(index)}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                    <td className="pl-[5px] pr-1 py-1 align-middle">
                      <input
                        type="text"
                        disabled={disabled}
                        value={part}
                        onChange={(e) => updatePart(index, e.target.value)}
                        className={FIELD_INPUT}
                        aria-label={`Part ${index + 1}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className={SECTION_TITLE}>Notes</p>
        <textarea
          rows={3}
          disabled={disabled}
          value={form.notes}
          onChange={(e) => patch("notes", e.target.value)}
          className={FIELD_TEXTAREA}
          aria-label="Notes"
        />
      </div>
    </div>
  );
}
