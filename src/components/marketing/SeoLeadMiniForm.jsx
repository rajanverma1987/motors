"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

/**
 * Compact lead capture for SEO landings → /api/contact-demo (extended with business/city/source).
 */
export default function SeoLeadMiniForm({
  sourcePage = "",
  defaultCity = "",
  defaultState = "",
  /** Button label — software SEO pages use "Book a demo" per Seo.md. */
  submitLabel = "Request info & Shop Management System access",
  /** "prominent" — larger fields and submit button for demo panels. */
  variant = "default",
  /** Prefix for input ids when multiple forms appear on one page. */
  idPrefix = "seo-lead",
  /** Optional override for the small print below submit. */
  footerNote,
}) {
  const isProminent = variant === "prominent";
  const labelClass = isProminent ? "mb-1.5 block text-sm font-medium text-title" : "mb-1 block text-xs font-medium text-secondary";
  const inputClassName = isProminent ? "py-3 text-base" : "";
  const formClass = isProminent ? "space-y-4" : "space-y-3";
  const gridGap = isProminent ? "gap-4" : "gap-3";
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
    <form onSubmit={handleSubmit} className={formClass}>
      <div className={`grid ${gridGap} sm:grid-cols-2`}>
        <div>
          <label htmlFor={`${idPrefix}-name`} className={labelClass}>
            Name *
          </label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            autoComplete="name"
            placeholder="Your name"
            inputClassName={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-phone`} className={labelClass}>
            Phone *
          </label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            autoComplete="tel"
            placeholder="Best number to reach you"
            inputClassName={inputClassName}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-email`} className={labelClass}>
          Email *
        </label>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
          placeholder="you@company.com"
          inputClassName={inputClassName}
        />
      </div>
      <div className={`grid ${gridGap} sm:grid-cols-2`}>
        <div>
          <label htmlFor={`${idPrefix}-business`} className={labelClass}>
            Business / shop name *
          </label>
          <Input
            id={`${idPrefix}-business`}
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            required
            placeholder="Repair shop or company"
            inputClassName={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-city`} className={labelClass}>
            City *
          </label>
          <Input
            id={`${idPrefix}-city`}
            name="city"
            value={form.city}
            onChange={handleChange}
            required
            placeholder="City you serve"
            inputClassName={inputClassName}
          />
        </div>
      </div>
      {defaultState ? (
        <p className={`rounded-lg border border-border bg-bg text-secondary ${isProminent ? "px-4 py-3 text-sm" : "px-3 py-2 text-sm"}`}>
          <span className="font-medium text-title">State:</span> {defaultState}
        </p>
      ) : (
        <div>
          <label htmlFor={`${idPrefix}-state`} className={labelClass}>
            State
          </label>
          <Input
            id={`${idPrefix}-state`}
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="State (optional)"
            inputClassName={inputClassName}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button
        type="submit"
        variant="primary"
        size={isProminent ? "lg" : "md"}
        className={`w-full ${isProminent ? "font-semibold shadow-md" : ""}`}
        disabled={submitting}
      >
        {submitting ? "Sending…" : submitLabel}
      </Button>
      <p className={isProminent ? "text-sm text-secondary" : "text-xs text-secondary"}>
        {footerNote ?? "We'll follow up to help you get listed and onboarded. Prefer email? "}
        <a href="/contact" className="text-primary underline">
          Contact page
        </a>
        .
      </p>
    </form>
  );
}
