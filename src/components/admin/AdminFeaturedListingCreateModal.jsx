"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

function generateTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let s = "";
  for (let i = 0; i < 14; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

const INITIAL = {
  companyName: "",
  email: "",
  phone: "",
  primaryContactPerson: "",
  shortDescription: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
  website: "",
  password: "",
};

export default function AdminFeaturedListingCreateModal({
  open,
  onClose,
  onCreated,
  generatePassword,
  prefillEmail = "",
  prefillPhone = "",
}) {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const gen = generatePassword || generateTempPassword;

  useEffect(() => {
    if (!open) return;
    const pwd = generatePassword ? generatePassword() : generateTempPassword();
    setForm({
      ...INITIAL,
      email: (prefillEmail || "").trim(),
      phone: (prefillPhone || "").trim(),
      password: pwd,
    });
  }, [open, prefillEmail, prefillPhone, generatePassword]);

  const close = useCallback(() => {
    if (submitting) return;
    setForm(INITIAL);
    onClose();
  }, [submitting, onClose]);

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName?.trim() || !form.email?.trim()) return;
    let pwd = form.password.trim();
    if (pwd.length < 6) pwd = gen();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/listings/create-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          password: pwd,
          pickupDeliveryAvailable: false,
          rushRepairAvailable: false,
          services: [],
          motorCapabilities: [],
          equipmentTesting: [],
          rewindingCapabilities: [],
          industriesServed: [],
          certifications: [],
          galleryPhotoUrls: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      toast.success("Listing created, account emailed.");
      onCreated?.(data);
      setForm(INITIAL);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New featured listing + account"
      size="2xl"
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="admin-featured-listing-form" variant="primary" size="sm" disabled={submitting}>
            {submitting ? "Creating…" : "Create & send email"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-secondary">
        Creates an <strong className="text-title">approved</strong> directory listing, a listing-only CRM login, and sends
        the welcome email with credentials. For full profile (services, photos), open the listing after save — same
        editor as the eye icon.
      </p>
      <Form id="admin-featured-listing-form" onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 !space-y-0">
        <Input label="Company name *" name="companyName" value={form.companyName} onChange={update} required />
        <Input label="Email (login) *" name="email" type="email" value={form.email} onChange={update} required />
        <Input label="Phone" name="phone" value={form.phone} onChange={update} />
        <Input label="Primary contact" name="primaryContactPerson" value={form.primaryContactPerson} onChange={update} />
        <Input label="Website" name="website" value={form.website} onChange={update} className="sm:col-span-2" />
        <Textarea
          label="Short description"
          name="shortDescription"
          value={form.shortDescription}
          onChange={update}
          rows={2}
          className="sm:col-span-2"
        />
        <Input label="Address" name="address" value={form.address} onChange={update} className="sm:col-span-2" />
        <Input label="City" name="city" value={form.city} onChange={update} />
        <Input label="State" name="state" value={form.state} onChange={update} />
        <Input label="ZIP" name="zipCode" value={form.zipCode} onChange={update} />
        <Input label="Country" name="country" value={form.country} onChange={update} />
        <div className="sm:col-span-2">
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
        </div>
      </Form>
      <p className="mt-3 text-xs text-secondary">
        After creation, edit the full listing like any other:{" "}
        <Link href="/admin/listings" className="text-primary hover:underline">
          open from the table
        </Link>
        .
      </p>
    </Modal>
  );
}
