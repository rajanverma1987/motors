"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Checkbox from "@/components/ui/checkbox";
import { Form, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  CERTIFICATIONS,
  EQUIPMENT_TESTING,
  INDUSTRIES_SERVED,
  MOTOR_CAPABILITIES,
  REWINDING_CAPABILITIES,
  SERVICES_OFFERED,
} from "@/lib/directory-listing-constants";
import { emptyAdminListingCreateForm } from "@/lib/admin-listing-json-prefill";

function generateTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let s = "";
  for (let i = 0; i < 14; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function CheckboxGroup({ name, options, selected = [], onToggle }) {
  const list = Array.isArray(selected) ? selected : [];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(({ key, label }) => (
        <Checkbox
          key={key}
          name={`${name}-${key}`}
          label={label}
          checked={list.includes(key)}
          onChange={() => {
            const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
            onToggle(name, next);
          }}
        />
      ))}
    </div>
  );
}

export default function AdminFeaturedListingCreateModal({
  open,
  onClose,
  onCreated,
  generatePassword,
  prefillEmail = "",
  prefillPhone = "",
  /** Full listing form fields from JSON paste (optional). */
  prefill = null,
  skipEmailVerification = false,
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => emptyAdminListingCreateForm());
  const [submitting, setSubmitting] = useState(false);
  const gen = generatePassword || generateTempPassword;

  useEffect(() => {
    if (!open) return;
    const pwd = generatePassword ? generatePassword() : generateTempPassword();
    const base = emptyAdminListingCreateForm();
    const fromJson = prefill && typeof prefill === "object" ? prefill : {};
    setForm({
      ...base,
      ...fromJson,
      email: String(fromJson.email || prefillEmail || "").trim(),
      phone: String(fromJson.phone || prefillPhone || "").trim(),
      password: String(fromJson.password || "").trim() || pwd,
      country: String(fromJson.country || base.country || "United States").trim() || "United States",
      services: Array.isArray(fromJson.services) ? fromJson.services : [],
      motorCapabilities: Array.isArray(fromJson.motorCapabilities) ? fromJson.motorCapabilities : [],
      equipmentTesting: Array.isArray(fromJson.equipmentTesting) ? fromJson.equipmentTesting : [],
      rewindingCapabilities: Array.isArray(fromJson.rewindingCapabilities)
        ? fromJson.rewindingCapabilities
        : [],
      industriesServed: Array.isArray(fromJson.industriesServed) ? fromJson.industriesServed : [],
      certifications: Array.isArray(fromJson.certifications) ? fromJson.certifications : [],
      galleryPhotoUrls: Array.isArray(fromJson.galleryPhotoUrls) ? fromJson.galleryPhotoUrls : [],
      pickupDeliveryAvailable: !!fromJson.pickupDeliveryAvailable,
      rushRepairAvailable: !!fromJson.rushRepairAvailable,
    });
  }, [open, prefill, prefillEmail, prefillPhone, generatePassword]);

  const close = useCallback(() => {
    if (submitting) return;
    setForm(emptyAdminListingCreateForm());
    onClose();
  }, [submitting, onClose]);

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName?.trim() || !form.email?.trim()) return;
    let pwd = String(form.password || "").trim();
    if (pwd.length < 6) pwd = gen();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/listings/create-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName: form.companyName,
          email: form.email,
          phone: form.phone,
          primaryContactPerson: form.primaryContactPerson,
          shortDescription: form.shortDescription,
          yearsInBusiness: form.yearsInBusiness,
          website: form.website,
          logoUrl: form.logoUrl,
          address: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
          services: form.services || [],
          maxMotorSizeHP: form.maxMotorSizeHP,
          maxVoltage: form.maxVoltage,
          maxWeightHandled: form.maxWeightHandled,
          motorCapabilities: form.motorCapabilities || [],
          equipmentTesting: form.equipmentTesting || [],
          rewindingCapabilities: form.rewindingCapabilities || [],
          industriesServed: form.industriesServed || [],
          pickupDeliveryAvailable: !!form.pickupDeliveryAvailable,
          rushRepairAvailable: !!form.rushRepairAvailable,
          craneCapacity: form.craneCapacity,
          forkliftCapacity: form.forkliftCapacity,
          turnaroundTime: form.turnaroundTime,
          certifications: form.certifications || [],
          shopSizeSqft: form.shopSizeSqft,
          numTechnicians: form.numTechnicians,
          numEngineers: form.numEngineers,
          yearsCombinedExperience: form.yearsCombinedExperience,
          galleryPhotoUrls: form.galleryPhotoUrls || [],
          serviceZipCode: form.serviceZipCode,
          serviceRadiusMiles: form.serviceRadiusMiles,
          statesServed: form.statesServed,
          citiesOrMetrosServed: form.citiesOrMetrosServed,
          areaCoveredFrom: form.areaCoveredFrom,
          password: pwd,
          skipEmailVerification: !!skipEmailVerification,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      toast.success(data.reusedExistingUser ? "Listing created (shared account)." : "Listing created, account emailed.");
      onCreated?.(data);
      setForm(emptyAdminListingCreateForm());
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const prefilledFromJson = Boolean(prefill && typeof prefill === "object");

  return (
    <Modal
      open={open}
      onClose={close}
      title="New featured listing + account"
      size="full"
      actions={
        <Button type="submit" form="admin-featured-listing-form" variant="primary" size="sm" disabled={submitting}>
          {submitting ? "Creating…" : "Create & send email"}
        </Button>
      }
    >
      <p className="text-sm text-secondary">
        Creates an <strong className="text-title">approved</strong> directory listing and a listing-only CRM login.
        Complete form matches the listing editor.
      </p>
      {prefilledFromJson ? (
        <p className="mt-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-title">
          Form prefilled from JSON — review all sections below before creating.
        </p>
      ) : null}
      {skipEmailVerification ? (
        <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          Email verification was skipped for this address. The listing will still be created, but the welcome email may
          not be deliverable.
        </p>
      ) : null}

      <Form id="admin-featured-listing-form" onSubmit={handleSubmit} className="mt-4 space-y-6 !space-y-6">
        <section className="space-y-3">
          <FormSectionTitle as="h3">Company & contact</FormSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Company name *" name="companyName" value={form.companyName} onChange={update} required />
            <Input label="Email (login) *" name="email" type="email" value={form.email} onChange={update} required />
            <Input label="Phone" name="phone" value={form.phone} onChange={update} />
            <Input label="Years in business" name="yearsInBusiness" value={form.yearsInBusiness} onChange={update} />
            <Input label="Website" name="website" value={form.website} onChange={update} />
            <Input label="Logo URL" name="logoUrl" value={form.logoUrl} onChange={update} />
            <Input
              label="Primary contact"
              name="primaryContactPerson"
              value={form.primaryContactPerson}
              onChange={update}
              className="sm:col-span-2"
            />
            <Textarea
              label="Short description"
              name="shortDescription"
              value={form.shortDescription}
              onChange={update}
              rows={2}
              className="sm:col-span-2"
            />
          </div>
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Address</FormSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Address" name="address" value={form.address} onChange={update} className="sm:col-span-2" />
            <Input label="City" name="city" value={form.city} onChange={update} />
            <Input label="State" name="state" value={form.state} onChange={update} />
            <Input label="ZIP" name="zipCode" value={form.zipCode} onChange={update} />
            <Input label="Country" name="country" value={form.country} onChange={update} />
          </div>
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Services offered</FormSectionTitle>
          <CheckboxGroup name="services" options={SERVICES_OFFERED} selected={form.services} onToggle={setField} />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Motor capabilities</FormSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Max motor size (HP)" name="maxMotorSizeHP" value={form.maxMotorSizeHP} onChange={update} />
            <Input label="Max voltage" name="maxVoltage" value={form.maxVoltage} onChange={update} />
            <Input label="Max weight handled" name="maxWeightHandled" value={form.maxWeightHandled} onChange={update} />
          </div>
          <CheckboxGroup
            name="motorCapabilities"
            options={MOTOR_CAPABILITIES}
            selected={form.motorCapabilities}
            onToggle={setField}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Equipment & testing</FormSectionTitle>
          <CheckboxGroup
            name="equipmentTesting"
            options={EQUIPMENT_TESTING}
            selected={form.equipmentTesting}
            onToggle={setField}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Rewinding capabilities</FormSectionTitle>
          <CheckboxGroup
            name="rewindingCapabilities"
            options={REWINDING_CAPABILITIES}
            selected={form.rewindingCapabilities}
            onToggle={setField}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Industries served</FormSectionTitle>
          <CheckboxGroup
            name="industriesServed"
            options={INDUSTRIES_SERVED}
            selected={form.industriesServed}
            onToggle={setField}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Logistics & handling</FormSectionTitle>
          <div className="flex flex-wrap gap-6">
            <Checkbox
              name="pickupDeliveryAvailable"
              label="Pickup and delivery available"
              checked={!!form.pickupDeliveryAvailable}
              onChange={(e) => setField("pickupDeliveryAvailable", e.target.checked)}
            />
            <Checkbox
              name="rushRepairAvailable"
              label="Rush repair available"
              checked={!!form.rushRepairAvailable}
              onChange={(e) => setField("rushRepairAvailable", e.target.checked)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Crane capacity" name="craneCapacity" value={form.craneCapacity} onChange={update} />
            <Input label="Forklift capacity" name="forkliftCapacity" value={form.forkliftCapacity} onChange={update} />
            <Input
              label="Typical turnaround time"
              name="turnaroundTime"
              value={form.turnaroundTime}
              onChange={update}
              className="sm:col-span-2"
            />
          </div>
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Certifications</FormSectionTitle>
          <CheckboxGroup
            name="certifications"
            options={CERTIFICATIONS}
            selected={form.certifications}
            onToggle={setField}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Shop facilities</FormSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Shop size (sq ft)" name="shopSizeSqft" value={form.shopSizeSqft} onChange={update} />
            <Input label="Number of technicians" name="numTechnicians" value={form.numTechnicians} onChange={update} />
            <Input label="Number of engineers" name="numEngineers" value={form.numEngineers} onChange={update} />
            <Input
              label="Years of combined experience"
              name="yearsCombinedExperience"
              value={form.yearsCombinedExperience}
              onChange={update}
              className="sm:col-span-2 lg:col-span-3 max-w-xs"
            />
          </div>
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Gallery photo URLs</FormSectionTitle>
          <Textarea
            label="One URL per line (optional)"
            name="galleryPhotoUrlsText"
            value={(form.galleryPhotoUrls || []).join("\n")}
            onChange={(e) =>
              setField(
                "galleryPhotoUrls",
                e.target.value
                  .split(/\r?\n/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            rows={3}
            placeholder="https://example.com/photo1.jpg"
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle as="h3">Service region</FormSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Service ZIP" name="serviceZipCode" value={form.serviceZipCode} onChange={update} />
            <Input
              label="Radius (miles)"
              name="serviceRadiusMiles"
              value={form.serviceRadiusMiles}
              onChange={update}
            />
            <Input label="States served" name="statesServed" value={form.statesServed} onChange={update} />
            <Input
              label="Cities / metros"
              name="citiesOrMetrosServed"
              value={form.citiesOrMetrosServed}
              onChange={update}
            />
            <Textarea
              label="Area covered from"
              name="areaCoveredFrom"
              value={form.areaCoveredFrom}
              onChange={update}
              rows={2}
              className="sm:col-span-2"
            />
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <FormSectionTitle as="h3">Account password</FormSectionTitle>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <label className="text-sm font-medium text-title" htmlFor="featured-password">
              Temporary password *
            </label>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setForm((f) => ({ ...f, password: gen() }))}
            >
              Generate
            </button>
          </div>
          <Input
            id="featured-password"
            name="password"
            type="text"
            autoComplete="new-password"
            value={form.password}
            onChange={update}
            placeholder="Min 6 characters — emailed to the shop"
          />
        </section>
      </Form>

      <p className="mt-3 text-xs text-secondary">
        After creation, open the listing from the table to upload logo/gallery files if needed.{" "}
        <Link href="/admin/listings" className="text-primary hover:underline">
          Back to list
        </Link>
        .
      </p>
    </Modal>
  );
}
