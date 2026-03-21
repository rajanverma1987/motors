"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

/**
 * Compact lead capture for SEO landings → /api/contact-demo (extended with business/city/source).
 */
export default function SeoLeadMiniForm({ sourcePage = "", defaultCity = "", defaultState = "" }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    city: defaultCity,
    state: defaultState,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          businessName: form.businessName,
          city: form.city,
          state: form.state,
          sourcePage: sourcePage || (typeof window !== "undefined" ? window.location.pathname : ""),
          preferDate: "",
          preferTime: "",
          timezone: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/contact/thank-you");
    } catch (err) {
      setError(err.message || "Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="seo-lead-name" className="mb-1 block text-xs font-medium text-secondary">
            Name *
          </label>
          <Input
            id="seo-lead-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            autoComplete="name"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="seo-lead-phone" className="mb-1 block text-xs font-medium text-secondary">
            Phone *
          </label>
          <Input
            id="seo-lead-phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            autoComplete="tel"
            placeholder="Best number to reach you"
          />
        </div>
      </div>
      <div>
        <label htmlFor="seo-lead-email" className="mb-1 block text-xs font-medium text-secondary">
          Email *
        </label>
        <Input
          id="seo-lead-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="seo-lead-business" className="mb-1 block text-xs font-medium text-secondary">
            Business / shop name *
          </label>
          <Input
            id="seo-lead-business"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            required
            placeholder="Repair shop or company"
          />
        </div>
        <div>
          <label htmlFor="seo-lead-city" className="mb-1 block text-xs font-medium text-secondary">
            City *
          </label>
          <Input
            id="seo-lead-city"
            name="city"
            value={form.city}
            onChange={handleChange}
            required
            placeholder="City you serve"
          />
        </div>
      </div>
      {defaultState ? (
        <p className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-secondary">
          <span className="font-medium text-title">State:</span> {defaultState}
        </p>
      ) : (
        <div>
          <label htmlFor="seo-lead-state" className="mb-1 block text-xs font-medium text-secondary">
            State
          </label>
          <Input
            id="seo-lead-state"
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="State (optional)"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Request info & CRM access"}
      </Button>
      <p className="text-xs text-secondary">
        We&apos;ll follow up to help you get listed and onboarded. Prefer email?{" "}
        <a href="/contact" className="text-primary underline">
          Contact page
        </a>
        .
      </p>
    </form>
  );
}
