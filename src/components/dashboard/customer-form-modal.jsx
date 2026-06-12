"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  buildCustomerPayload,
  customerApiToForm,
  INITIAL_CUSTOMER_FORM,
} from "@/lib/customer-record-form";

const FORM_ID = "customer-form-modal-edit";

export default function CustomerFormModal({
  open,
  customerId,
  onClose,
  onAfterSave,
  zIndex = 135,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_CUSTOMER_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const load = useCallback(async () => {
    const id = String(customerId || "").trim();
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load customer");
      setForm(customerApiToForm(data));
    } catch (e) {
      toast.error(e.message || "Failed to load customer");
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [customerId, toast, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_CUSTOMER_FORM);
      setLoading(false);
      return;
    }
    const id = String(customerId || "").trim();
    if (!id) {
      onClose?.();
      return;
    }
    load();
  }, [open, customerId, load, onClose]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = String(customerId || "").trim();
    const current = formRef.current;
    if (!id || !current.companyName?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCustomerPayload(current)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      toast.success("Customer updated.");
      onAfterSave?.(data);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit customer"
      size="4xl"
      width="min(1200px, 96vw)"
      showClose={!saving}
      zIndex={zIndex}
      actions={
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || loading}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-secondary">Loading…</p>
      ) : (
        <Form id={FORM_ID} onSubmit={handleSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <FormSection title="Company & contact">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Company name"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                required
              />
              <Input
                label="Primary contact name"
                value={form.primaryContactName}
                onChange={(e) => setForm((f) => ({ ...f, primaryContactName: e.target.value }))}
              />
              <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <Input label="EIN" value={form.ein} onChange={(e) => setForm((f) => ({ ...f, ein: e.target.value }))} />
              <Input label="Credit limit" value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} />
              <Select
                label="Tax exempted"
                value={form.taxExempt ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    taxExempt: e.target.value !== "no",
                    taxPercent: e.target.value === "no" ? f.taxPercent : "",
                  }))
                }
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                searchable={false}
              />
              <Input
                label="Tax %"
                type="number"
                value={form.taxPercent}
                onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))}
                disabled={form.taxExempt}
              />
            </div>
          </FormSection>
          <FormSection
            title="Additional contacts"
            headerRight={
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalContact}>
                Add contact
              </Button>
            }
          >
            {(form.additionalContacts || []).length === 0 ? (
              <p className="text-sm text-secondary">No additional contacts.</p>
            ) : (
              <div className="space-y-3">
                {(form.additionalContacts || []).map((ac, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2 rounded border border-border bg-bg/50 p-3">
                    <Input
                      label="Name"
                      value={ac.contactName}
                      onChange={(e) => updateAdditionalContact(index, "contactName", e.target.value)}
                      className="min-w-[140px] flex-1"
                    />
                    <Input
                      label="Phone"
                      value={ac.phone}
                      onChange={(e) => updateAdditionalContact(index, "phone", e.target.value)}
                      className="min-w-[120px] flex-1"
                    />
                    <Input
                      label="Email"
                      value={ac.email}
                      onChange={(e) => updateAdditionalContact(index, "email", e.target.value)}
                      className="min-w-[160px] flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeAdditionalContact(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
          <FormSection title="Billing address">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Street address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="lg:col-span-2"
              />
              <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <Input label="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              <Input label="Zip code" value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} />
              <Input label="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
          </FormSection>
          <FormSection
            title="Shipping address"
            headerRight={
              <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>
                Copy from billing
              </Button>
            }
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Street address"
                value={form.shippingAddress}
                onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                className="lg:col-span-2"
              />
              <Input label="City" value={form.shippingCity} onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))} />
              <Input label="State" value={form.shippingState} onChange={(e) => setForm((f) => ({ ...f, shippingState: e.target.value }))} />
              <Input label="Zip code" value={form.shippingZipCode} onChange={(e) => setForm((f) => ({ ...f, shippingZipCode: e.target.value }))} />
              <Input label="Country" value={form.shippingCountry} onChange={(e) => setForm((f) => ({ ...f, shippingCountry: e.target.value }))} />
            </div>
          </FormSection>
          <FormSection title="Notes">
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="[&_label]:sr-only"
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  );
}
