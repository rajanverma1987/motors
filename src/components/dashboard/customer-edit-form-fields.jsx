"use client";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";

/**
 * Editable customer fields — shared by CustomerFormModal and CustomerViewModal.
 */
export default function CustomerEditFormFields({ form, setForm }) {
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
    <div className={FORM_SECTIONS_STACK_CLASS}>
      <FormSection title="Company & contact">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
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
          <Input
            label="Credit limit"
            value={form.creditLimit}
            onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
          />
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
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <Input
            label="Street address"
            value={form.shippingAddress}
            onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
            className="lg:col-span-2"
          />
          <Input
            label="City"
            value={form.shippingCity}
            onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
          />
          <Input
            label="State"
            value={form.shippingState}
            onChange={(e) => setForm((f) => ({ ...f, shippingState: e.target.value }))}
          />
          <Input
            label="Zip code"
            value={form.shippingZipCode}
            onChange={(e) => setForm((f) => ({ ...f, shippingZipCode: e.target.value }))}
          />
          <Input
            label="Country"
            value={form.shippingCountry}
            onChange={(e) => setForm((f) => ({ ...f, shippingCountry: e.target.value }))}
          />
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
    </div>
  );
}
