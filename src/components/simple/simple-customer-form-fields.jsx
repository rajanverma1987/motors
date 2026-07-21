"use client";

import { FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import SimpleSelect from "@/components/simple/simple-select";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-sm border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-sm border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-sm px-2.5 text-xs font-semibold";

const TAX_EXEMPT_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function FieldRow({ label, labelWidth = "7rem", children, className = "", controlClassName = "" }) {
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
 * Dense Access-like customer fields for Simple portal (matches Service Proposal form UI).
 */
export default function SimpleCustomerFormFields({ form, setForm }) {
  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addAdditionalContact = () => {
    setForm((f) => ({
      ...f,
      additionalContacts: [...(f.additionalContacts || []), { contactName: "", phone: "", email: "" }],
    }));
  };

  const updateAdditionalContact = (index, field, value) => {
    setForm((f) => {
      const next = [...(f.additionalContacts || [])];
      if (!next[index]) return f;
      next[index] = { ...next[index], [field]: value };
      return { ...f, additionalContacts: next };
    });
  };

  const removeAdditionalContact = (index) => {
    setForm((f) => ({
      ...f,
      additionalContacts: (f.additionalContacts || []).filter((_, i) => i !== index),
    }));
  };

  const copyBillingToShipping = () => {
    setForm((f) => ({
      ...f,
      shippingAddress: f.address,
      shippingCity: f.city,
      shippingState: f.state,
      shippingZipCode: f.zipCode,
      shippingCountry: f.country,
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2">
          <p className={SECTION_TITLE}>Company & contact</p>
          <FieldRow label="Company" labelWidth="6.75rem">
            <input
              type="text"
              required
              value={form.companyName}
              onChange={(e) => patch("companyName", e.target.value)}
              className={FIELD_INPUT}
              aria-label="Company name"
            />
          </FieldRow>
          <FieldRow label="Contact" labelWidth="6.75rem">
            <input
              type="text"
              value={form.primaryContactName}
              onChange={(e) => patch("primaryContactName", e.target.value)}
              className={FIELD_INPUT}
              aria-label="Primary contact name"
            />
          </FieldRow>
          <FieldRow label="Phone" labelWidth="6.75rem">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => patch("phone", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Email" labelWidth="6.75rem">
            <input
              type="email"
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="EIN" labelWidth="6.75rem">
            <input
              type="text"
              value={form.ein}
              onChange={(e) => patch("ein", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Credit limit" labelWidth="6.75rem">
            <input
              type="text"
              value={form.creditLimit}
              onChange={(e) => patch("creditLimit", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Tax exempt" labelWidth="6.75rem">
            <SimpleSelect
              options={TAX_EXEMPT_OPTIONS}
              value={form.taxExempt ? "yes" : "no"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  taxExempt: e.target.value !== "no",
                  taxPercent: e.target.value === "no" ? f.taxPercent : "",
                }))
              }
              searchable={false}
              aria-label="Tax exempted"
            />
          </FieldRow>
          <FieldRow label="Tax %" labelWidth="6.75rem">
            <input
              type="number"
              value={form.taxPercent}
              onChange={(e) => patch("taxPercent", e.target.value)}
              disabled={!!form.taxExempt}
              className={`${FIELD_INPUT} ${form.taxExempt ? "!bg-muted" : ""}`}
            />
          </FieldRow>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className={SECTION_TITLE}>Billing address</p>
          <FieldRow label="Street" labelWidth="5.5rem">
            <input
              type="text"
              value={form.address}
              onChange={(e) => patch("address", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="City" labelWidth="5.5rem">
            <input
              type="text"
              value={form.city}
              onChange={(e) => patch("city", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="State" labelWidth="5.5rem">
            <input
              type="text"
              value={form.state}
              onChange={(e) => patch("state", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Zip" labelWidth="5.5rem">
            <input
              type="text"
              value={form.zipCode}
              onChange={(e) => patch("zipCode", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Country" labelWidth="5.5rem">
            <input
              type="text"
              value={form.country}
              onChange={(e) => patch("country", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <p className={`${SECTION_TITLE} mb-0`}>Shipping address</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={TOOLBAR_BTN}
              onClick={copyBillingToShipping}
            >
              Copy billing
            </Button>
          </div>
          <FieldRow label="Street" labelWidth="5.5rem">
            <input
              type="text"
              value={form.shippingAddress}
              onChange={(e) => patch("shippingAddress", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="City" labelWidth="5.5rem">
            <input
              type="text"
              value={form.shippingCity}
              onChange={(e) => patch("shippingCity", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="State" labelWidth="5.5rem">
            <input
              type="text"
              value={form.shippingState}
              onChange={(e) => patch("shippingState", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Zip" labelWidth="5.5rem">
            <input
              type="text"
              value={form.shippingZipCode}
              onChange={(e) => patch("shippingZipCode", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Country" labelWidth="5.5rem">
            <input
              type="text"
              value={form.shippingCountry}
              onChange={(e) => patch("shippingCountry", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className={`${SECTION_TITLE} mb-0`}>Additional contacts</p>
          <Button type="button" variant="outline" size="sm" className={TOOLBAR_BTN} onClick={addAdditionalContact}>
            <FiPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Add contact
          </Button>
        </div>
        {(form.additionalContacts || []).length === 0 ? (
          <p className="text-xs text-secondary">No additional contacts.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(form.additionalContacts || []).map((ac, index) => (
              <div key={index} className="flex min-w-0 flex-wrap items-center gap-2">
                <FieldRow label="Name" labelWidth="3.5rem" className="min-w-[12rem] flex-1" controlClassName="min-w-0 flex-1">
                  <input
                    type="text"
                    value={ac.contactName}
                    onChange={(e) => updateAdditionalContact(index, "contactName", e.target.value)}
                    className={FIELD_INPUT}
                  />
                </FieldRow>
                <FieldRow label="Phone" labelWidth="3.5rem" className="min-w-[11rem] flex-1" controlClassName="min-w-0 flex-1">
                  <input
                    type="tel"
                    value={ac.phone}
                    onChange={(e) => updateAdditionalContact(index, "phone", e.target.value)}
                    className={FIELD_INPUT}
                  />
                </FieldRow>
                <FieldRow label="Email" labelWidth="3.5rem" className="min-w-[13rem] flex-1" controlClassName="min-w-0 flex-1">
                  <input
                    type="email"
                    value={ac.email}
                    onChange={(e) => updateAdditionalContact(index, "email", e.target.value)}
                    className={FIELD_INPUT}
                  />
                </FieldRow>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-danger hover:bg-danger/10"
                  title="Remove contact"
                  aria-label="Remove contact"
                  onClick={() => removeAdditionalContact(index)}
                >
                  <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className={SECTION_TITLE}>Notes</p>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => patch("notes", e.target.value)}
          className={FIELD_TEXTAREA}
          aria-label="Notes"
        />
      </div>
    </div>
  );
}
