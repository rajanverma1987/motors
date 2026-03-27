"use client";

import { useState } from "react";
import Button from "@/components/ui/button";

const INITIAL = {
  name: "",
  email: "",
  phone: "",
  businessType: "",
  teamSize: "",
  currentTools: "",
  mainProblem: "",
};

export default function PricingInquiryForm({ sourcePage = "/pricing" }) {
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          businessName: form.businessType,
          teamSize: form.teamSize,
          currentTools: form.currentTools,
          mainProblem: form.mainProblem,
          sourcePage,
          preferDate: "",
          preferTime: "",
          timezone: "",
          city: "",
          state: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit inquiry");
      setSuccess(true);
      setForm(INITIAL);
    } catch (err) {
      setError(err.message || "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="pricing-name" className="mb-1 block text-xs font-medium text-secondary">
          Name *
        </label>
        <input
          id="pricing-name"
          name="name"
          value={form.name}
          onChange={onChange}
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="pricing-email" className="mb-1 block text-xs font-medium text-secondary">
          Email *
        </label>
        <input
          id="pricing-email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="name@company.com"
        />
      </div>
      <div>
        <label htmlFor="pricing-business" className="mb-1 block text-xs font-medium text-secondary">
          Business type
        </label>
        <input
          id="pricing-business"
          name="businessType"
          value={form.businessType}
          onChange={onChange}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Repair center / OEM / Contractor"
        />
      </div>
      <div>
        <label htmlFor="pricing-team" className="mb-1 block text-xs font-medium text-secondary">
          Team size
        </label>
        <input
          id="pricing-team"
          name="teamSize"
          value={form.teamSize}
          onChange={onChange}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="e.g. 8 technicians + 2 office"
        />
      </div>
      <div>
        <label htmlFor="pricing-tools" className="mb-1 block text-xs font-medium text-secondary">
          Current tools
        </label>
        <input
          id="pricing-tools"
          name="currentTools"
          value={form.currentTools}
          onChange={onChange}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Excel, ERP, CRM, WhatsApp..."
        />
      </div>
      <div>
        <label htmlFor="pricing-problem" className="mb-1 block text-xs font-medium text-secondary">
          Main problem
        </label>
        <input
          id="pricing-problem"
          name="mainProblem"
          value={form.mainProblem}
          onChange={onChange}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Delayed updates, quote leaks..."
        />
      </div>
      <div>
        <label htmlFor="pricing-phone" className="mb-1 block text-xs font-medium text-secondary">
          Phone
        </label>
        <input
          id="pricing-phone"
          name="phone"
          value={form.phone}
          onChange={onChange}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="+1 555 000 0000"
        />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? "Submitting..." : "Get Pricing"}
        </Button>
      </div>
      {error ? <p className="sm:col-span-2 text-xs text-danger">{error}</p> : null}
      {success ? (
        <p className="sm:col-span-2 text-xs text-success">
          Thanks. We received your request and will contact you shortly.
        </p>
      ) : null}
    </form>
  );
}
