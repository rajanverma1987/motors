"use client";

import { useRef, useState } from "react";
import { FiEye, FiPlus, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import {
  CUSTOMER_TYPE_OPTIONS,
  deleteCustomerDocumentFile,
  PAYMENT_TERMS_OPTIONS,
  PREFERRED_CONTACT_METHOD_OPTIONS,
  PREFERRED_PAYMENT_METHOD_OPTIONS,
  resolveCustomerDocumentHref,
  uploadCustomerDocumentFiles,
} from "@/lib/customer-record-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE =
  "mb-1.5 border-b border-primary/25 pb-1 text-sm font-bold uppercase tracking-wide text-primary";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold";

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

/** Two short fields side-by-side (Customer details / stacked layout). */
function PairRow({ leftLabel, rightLabel, left, right, labelWidth = "6.5rem" }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
      <FieldRow label={leftLabel} labelWidth={labelWidth}>
        {left}
      </FieldRow>
      <FieldRow label={rightLabel} labelWidth={labelWidth}>
        {right}
      </FieldRow>
    </div>
  );
}

/**
 * Dense Access-like customer fields for Simple portal (matches Service Proposal form UI).
 * @param {"grid"|"stacked"} [layout="grid"] — grid = 3 columns on large screens; stacked = single column (e.g. side panel).
 * @param {string} [customerId] — when set, files upload immediately; otherwise queued until customer is created.
 */
export default function SimpleCustomerFormFields({ form, setForm, layout = "grid", customerId = "" }) {
  const alert = useAlert();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState("");
  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const isStacked = layout === "stacked";
  const columnsClass = isStacked ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3";
  /** Customer details (stacked) uses slightly shorter labels so pairs fit cleanly. */
  const labelW = isStacked ? "6.5rem" : "7.25rem";
  const pairLabelW = isStacked ? "5.75rem" : "6.5rem";
  const resolvedCustomerId = String(customerId || "").trim();
  const docsBusy = uploading || Boolean(deletingKey);

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

  const openFilePicker = () => {
    if (docsBusy) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f && typeof f === "object");
    e.target.value = "";
    if (files.length === 0) return;

    if (!resolvedCustomerId) {
      setForm((f) => ({
        ...f,
        documents: [
          ...(f.documents || []),
          ...files.map((file) => ({
            name: String(file.name || "Document").trim() || "Document",
            url: "",
            _pendingKey: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            _pendingFile: file,
          })),
        ],
      }));
      return;
    }

    setUploading(true);
    try {
      const pending = files.map((file) => ({
        name: String(file.name || "Document").trim() || "Document",
        _pendingFile: file,
      }));
      const documents = await uploadCustomerDocumentFiles(resolvedCustomerId, pending);
      if (documents) {
        setForm((f) => ({ ...f, documents }));
      }
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Document upload failed",
        variant: "danger",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateDocument = (index, field, value) => {
    setForm((f) => {
      const next = [...(f.documents || [])];
      if (!next[index]) return f;
      next[index] = { ...next[index], [field]: value };
      return { ...f, documents: next };
    });
  };

  const removeDocument = async (index) => {
    const doc = (form.documents || [])[index];
    if (!doc || docsBusy) return;
    const label = String(doc.name || "this document").trim() || "this document";
    const ok = await confirm({
      title: "Remove document",
      message: `Remove “${label}”?${doc.url ? " The uploaded file will be deleted." : ""}`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    const rowKey = doc.url || doc._pendingKey || String(index);
    if (resolvedCustomerId && doc.url) {
      setDeletingKey(rowKey);
      try {
        const documents = await deleteCustomerDocumentFile(resolvedCustomerId, doc.url);
        setForm((f) => ({ ...f, documents }));
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to remove document",
          variant: "danger",
        });
      } finally {
        setDeletingKey("");
      }
      return;
    }

    setForm((f) => ({
      ...f,
      documents: (f.documents || []).filter((_, i) => i !== index),
    }));
  };

  const openDocument = (doc) => {
    const href = resolveCustomerDocumentHref(doc?.url);
    if (!href) {
      void alert({ title: "Error", message: "File is not available yet.", variant: "danger" });
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
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
      <div className={`grid gap-4 ${columnsClass}`}>
        <div className="flex min-w-0 flex-col gap-2">
          <p className={SECTION_TITLE}>Company & contact</p>
          <FieldRow label="Customer ID" labelWidth={labelW}>
            <input
              type="text"
              value={form.customerNumber || ""}
              onChange={(e) => patch("customerNumber", e.target.value)}
              className={FIELD_INPUT}
              aria-label="Customer ID"
              placeholder="e.g. 001"
            />
          </FieldRow>
          <FieldRow label="Contact Name" labelWidth={labelW}>
            <input
              type="text"
              value={form.primaryContactName}
              onChange={(e) => patch("primaryContactName", e.target.value)}
              className={FIELD_INPUT}
              aria-label="Contact Name"
            />
          </FieldRow>
          <FieldRow label="Customer" labelWidth={labelW}>
            <input
              type="text"
              required
              value={form.companyName}
              onChange={(e) => patch("companyName", e.target.value)}
              className={FIELD_INPUT}
              aria-label="Customer"
            />
          </FieldRow>
          {isStacked ? (
            <PairRow
              labelWidth={pairLabelW}
              leftLabel="Phone"
              rightLabel="Fax"
              left={
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => patch("phone", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Phone"
                />
              }
              right={
                <input
                  type="tel"
                  value={form.fax || ""}
                  onChange={(e) => patch("fax", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Fax"
                />
              }
            />
          ) : (
            <>
              <FieldRow label="Phone" labelWidth={labelW}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => patch("phone", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Fax" labelWidth={labelW}>
                <input
                  type="tel"
                  value={form.fax || ""}
                  onChange={(e) => patch("fax", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
            </>
          )}
          <FieldRow label="Email" labelWidth={labelW}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          {isStacked ? (
            <PairRow
              labelWidth={pairLabelW}
              leftLabel="Alt. phone"
              rightLabel="Alt. email"
              left={
                <input
                  type="tel"
                  value={form.alternatePhone || ""}
                  onChange={(e) => patch("alternatePhone", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Alternate phone"
                />
              }
              right={
                <input
                  type="email"
                  value={form.alternateEmail || ""}
                  onChange={(e) => patch("alternateEmail", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Alternate email"
                />
              }
            />
          ) : (
            <>
              <FieldRow label="Alt. phone" labelWidth={labelW}>
                <input
                  type="tel"
                  value={form.alternatePhone || ""}
                  onChange={(e) => patch("alternatePhone", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Alternate phone"
                />
              </FieldRow>
              <FieldRow label="Alt. email" labelWidth={labelW}>
                <input
                  type="email"
                  value={form.alternateEmail || ""}
                  onChange={(e) => patch("alternateEmail", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Alternate email"
                />
              </FieldRow>
            </>
          )}
          <FieldRow label="Billing contact" labelWidth={labelW}>
            <input
              type="text"
              value={form.billingContact || ""}
              onChange={(e) => patch("billingContact", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className={SECTION_TITLE}>Account</p>
          <FieldRow label="Customer type" labelWidth={labelW}>
            <SimpleSelect
              options={CUSTOMER_TYPE_OPTIONS}
              value={form.customerType || ""}
              onChange={(e) => patch("customerType", e.target.value)}
              searchable={false}
              aria-label="Customer type"
            />
          </FieldRow>
          {isStacked ? (
            <PairRow
              labelWidth={pairLabelW}
              leftLabel="Payment terms"
              rightLabel="Pref. payment"
              left={
                <SimpleSelect
                  options={PAYMENT_TERMS_OPTIONS}
                  value={form.paymentTerms || ""}
                  onChange={(e) => patch("paymentTerms", e.target.value)}
                  searchable={false}
                  aria-label="Payment terms"
                />
              }
              right={
                <SimpleSelect
                  options={PREFERRED_PAYMENT_METHOD_OPTIONS}
                  value={form.preferredPaymentMethod || ""}
                  onChange={(e) => patch("preferredPaymentMethod", e.target.value)}
                  searchable={false}
                  aria-label="Preferred payment method"
                />
              }
            />
          ) : (
            <>
              <FieldRow label="Payment terms" labelWidth={labelW}>
                <SimpleSelect
                  options={PAYMENT_TERMS_OPTIONS}
                  value={form.paymentTerms || ""}
                  onChange={(e) => patch("paymentTerms", e.target.value)}
                  searchable={false}
                  aria-label="Payment terms"
                />
              </FieldRow>
              <FieldRow label="Pref. payment" labelWidth={labelW}>
                <SimpleSelect
                  options={PREFERRED_PAYMENT_METHOD_OPTIONS}
                  value={form.preferredPaymentMethod || ""}
                  onChange={(e) => patch("preferredPaymentMethod", e.target.value)}
                  searchable={false}
                  aria-label="Preferred payment method"
                />
              </FieldRow>
            </>
          )}
          <FieldRow label="Pref. contact" labelWidth={labelW}>
            <SimpleSelect
              options={PREFERRED_CONTACT_METHOD_OPTIONS}
              value={form.preferredContactMethod || ""}
              onChange={(e) => patch("preferredContactMethod", e.target.value)}
              searchable={false}
              aria-label="Preferred contact method"
            />
          </FieldRow>
          {isStacked ? (
            <PairRow
              labelWidth={pairLabelW}
              leftLabel="EIN"
              rightLabel="Credit limit"
              left={
                <input
                  type="text"
                  value={form.ein}
                  onChange={(e) => patch("ein", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="EIN"
                />
              }
              right={
                <input
                  type="text"
                  value={form.creditLimit}
                  onChange={(e) => patch("creditLimit", e.target.value)}
                  className={FIELD_INPUT}
                  aria-label="Credit limit"
                />
              }
            />
          ) : (
            <>
              <FieldRow label="EIN" labelWidth={labelW}>
                <input
                  type="text"
                  value={form.ein}
                  onChange={(e) => patch("ein", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Credit limit" labelWidth={labelW}>
                <input
                  type="text"
                  value={form.creditLimit}
                  onChange={(e) => patch("creditLimit", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
            </>
          )}
          {isStacked ? (
            <PairRow
              labelWidth={pairLabelW}
              leftLabel="Tax exempt"
              rightLabel="Tax %"
              left={
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
              }
              right={
                <input
                  type="number"
                  value={form.taxPercent}
                  onChange={(e) => patch("taxPercent", e.target.value)}
                  disabled={!!form.taxExempt}
                  className={`${FIELD_INPUT} ${form.taxExempt ? "!bg-muted" : ""}`}
                  aria-label="Tax percent"
                />
              }
            />
          ) : (
            <>
              <FieldRow label="Tax exempt" labelWidth={labelW}>
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
              <FieldRow label="Tax %" labelWidth={labelW}>
                <input
                  type="number"
                  value={form.taxPercent}
                  onChange={(e) => patch("taxPercent", e.target.value)}
                  disabled={!!form.taxExempt}
                  className={`${FIELD_INPUT} ${form.taxExempt ? "!bg-muted" : ""}`}
                />
              </FieldRow>
            </>
          )}
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
          <div className="flex min-w-0 items-center gap-2">
            <label className={FIELD_LABEL} style={{ width: "5.5rem" }}>
              City
            </label>
            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.1fr)_auto_minmax(0,5rem)] items-center gap-x-1.5">
              <input
                type="text"
                value={form.city}
                onChange={(e) => patch("city", e.target.value)}
                className={`${FIELD_INPUT} !w-full`}
                aria-label="City"
              />
              <label className="shrink-0 text-xs font-bold text-title">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => patch("state", e.target.value)}
                className={`${FIELD_INPUT} !w-full`}
                aria-label="State"
              />
              <label className="shrink-0 text-xs font-bold text-title">Zip</label>
              <input
                type="text"
                value={form.zipCode}
                onChange={(e) => patch("zipCode", e.target.value)}
                className={`${FIELD_INPUT} !w-full`}
                aria-label="Zip"
              />
            </div>
          </div>
          <FieldRow label="Country" labelWidth="5.5rem">
            <input
              type="text"
              value={form.country}
              onChange={(e) => patch("country", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>

          <div className="mb-0.5 mt-2 flex items-center justify-between gap-2">
            <p className={`${SECTION_TITLE} mb-0`}>Service / shipping</p>
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
          <div className="flex min-w-0 items-center gap-2">
            <label className={FIELD_LABEL} style={{ width: "5.5rem" }}>
              City
            </label>
            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.1fr)_auto_minmax(0,5rem)] items-center gap-x-1.5">
              <input
                type="text"
                value={form.shippingCity}
                onChange={(e) => patch("shippingCity", e.target.value)}
                className={`${FIELD_INPUT} !w-full`}
                aria-label="Shipping city"
              />
              <label className="shrink-0 text-xs font-bold text-title">State</label>
              <input
                type="text"
                value={form.shippingState}
                onChange={(e) => patch("shippingState", e.target.value)}
                className={`${FIELD_INPUT} !w-full`}
                aria-label="Shipping state"
              />
              <label className="shrink-0 text-xs font-bold text-title">Zip</label>
              <input
                type="text"
                value={form.shippingZipCode}
                onChange={(e) => patch("shippingZipCode", e.target.value)}
                className={`${FIELD_INPUT} !w-full`}
                aria-label="Shipping zip"
              />
            </div>
          </div>
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
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-primary/[0.06] dark:bg-primary/10">
                  <th className="pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    Name
                  </th>
                  <th className="pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    Phone
                  </th>
                  <th className="pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    Email
                  </th>
                  <th className="w-10 pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    {" "}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(form.additionalContacts || []).map((ac, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className="pl-[5px] pr-1 py-1 align-middle">
                      <input
                        type="text"
                        value={ac.contactName}
                        onChange={(e) => updateAdditionalContact(index, "contactName", e.target.value)}
                        className={FIELD_INPUT}
                        aria-label={`Contact ${index + 1} name`}
                      />
                    </td>
                    <td className="pl-[5px] pr-1 py-1 align-middle">
                      <input
                        type="tel"
                        value={ac.phone}
                        onChange={(e) => updateAdditionalContact(index, "phone", e.target.value)}
                        className={FIELD_INPUT}
                        aria-label={`Contact ${index + 1} phone`}
                      />
                    </td>
                    <td className="pl-[5px] pr-1 py-1 align-middle">
                      <input
                        type="email"
                        value={ac.email}
                        onChange={(e) => updateAdditionalContact(index, "email", e.target.value)}
                        className={FIELD_INPUT}
                        aria-label={`Contact ${index + 1} email`}
                      />
                    </td>
                    <td className="pl-[5px] pr-1 py-1 align-middle text-center">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-danger hover:bg-danger/10"
                        title="Remove contact"
                        aria-label="Remove contact"
                        onClick={() => removeAdditionalContact(index)}
                      >
                        <FiX className="h-3.5 w-3.5" aria-hidden />
                      </button>
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
          value={form.notes}
          onChange={(e) => patch("notes", e.target.value)}
          className={FIELD_TEXTAREA}
          aria-label="Notes"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className={`${SECTION_TITLE} mb-0`}>Documents</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TOOLBAR_BTN}
            onClick={openFilePicker}
            disabled={docsBusy}
          >
            <FiPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {uploading ? "Uploading…" : "Add document"}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
          aria-hidden
          tabIndex={-1}
        />
        <p className="text-xs text-secondary">
          {resolvedCustomerId
            ? "Upload files (e.g. tax exempt certificate). Files are saved immediately."
            : "Upload files (e.g. tax exempt certificate). Files are saved when you create the customer."}
        </p>
        {(form.documents || []).length === 0 ? (
          <p className="text-xs text-secondary">No documents.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-primary/[0.06] dark:bg-primary/10">
                  <th className="w-10 pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    {" "}
                  </th>
                  <th className="pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    Document name
                  </th>
                  <th className="pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    File
                  </th>
                  <th className="w-10 pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
                    {" "}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(form.documents || []).map((doc, index) => {
                  const rowKey = doc.url || doc._pendingKey || `doc-${index}`;
                  const fileLabel = doc._pendingFile
                    ? doc._pendingFile.name || "Pending upload"
                    : doc.url
                      ? doc.url.split("/").pop() || "Uploaded file"
                      : "—";
                  return (
                    <tr key={rowKey} className="border-b border-border last:border-b-0">
                      <td className="pl-[5px] pr-1 py-1 align-middle">
                        {doc.url ? (
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary/10"
                            title="View file"
                            aria-label="View file"
                            onClick={() => openDocument(doc)}
                          >
                            <FiEye className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ) : null}
                      </td>
                      <td className="pl-[5px] pr-1 py-1 align-middle">
                        <input
                          type="text"
                          value={doc.name || ""}
                          onChange={(e) => updateDocument(index, "name", e.target.value)}
                          className={FIELD_INPUT}
                          aria-label={`Document ${index + 1} name`}
                          disabled={docsBusy}
                        />
                      </td>
                      <td className="pl-[5px] pr-1 py-1 align-middle">
                        <span className="block truncate text-xs text-secondary" title={fileLabel}>
                          {doc._pendingFile ? "Pending upload — " : ""}
                          {fileLabel}
                        </span>
                      </td>
                      <td className="pl-[5px] pr-1 py-1 align-middle text-center">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-danger hover:bg-danger/10 disabled:opacity-50"
                          title="Remove document"
                          aria-label="Remove document"
                          disabled={docsBusy}
                          onClick={() => removeDocument(index)}
                        >
                          <FiX className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
