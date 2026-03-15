"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import HeroBackground from "@/components/marketing/HeroBackground";

function getDetectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export default function ContactPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferDate: "",
    preferTime: "",
    timezone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const tz = getDetectedTimezone();
    if (tz) setForm((prev) => ({ ...prev, timezone: tz }));
  }, []);

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
        body: JSON.stringify(form),
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
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]" aria-hidden />
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              Get in touch
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl lg:text-6xl">
              Contact for demo
            </h1>
            <p className="mt-5 text-lg text-secondary sm:text-xl">
              Schedule a demo, ask about pricing, or get support. We&apos;ll respond within 24 hrs.
            </p>
          </div>
        </div>
      </section>

      {/* Main: side info + form */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:items-start">
            {/* Side info */}
            <div className="order-2 lg:order-1 lg:sticky lg:top-8">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-title">Why reach out?</h2>
                <ul className="mt-5 space-y-4">
                  <li className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </span>
                    <div>
                      <span className="font-medium text-title">Schedule a demo</span>
                      <p className="mt-0.5 text-sm text-secondary">See how MotorsWinding.com works for your shop—work orders, leads, and more.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                    <div>
                      <span className="font-medium text-title">Pricing & plans</span>
                      <p className="mt-0.5 text-sm text-secondary">Starter, Professional, or Enterprise—we’ll match you with the right plan.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </span>
                    <div>
                      <span className="font-medium text-title">Support & questions</span>
                      <p className="mt-0.5 text-sm text-secondary">Technical help, directory listing, or lead generation—we’re here to help.</p>
                    </div>
                  </li>
                </ul>

                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">Direct email</h3>
                  <p className="mt-3 text-sm">
                    <a href="mailto:contact@MotorsWinding.com" className="font-medium text-primary hover:underline">contact@MotorsWinding.com</a>
                  </p>
                </div>

                <p className="mt-6 text-xs text-secondary">
                  Typically we reply within 1–2 business days. For urgent issues, mention it in your message.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="order-1 lg:order-2">
              <Form onSubmit={handleSubmit} className="shadow-sm sm:p-8">
                <h2 className="text-xl font-semibold text-title">Request a demo</h2>
                <p className="mt-1 text-sm text-secondary">
                  Tell us when works for you and we&apos;ll get back shortly.
                </p>
                {error && (
                  <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <div className="mt-6 space-y-5">
                  <Input
                    label="Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    required
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. (555) 123-4567"
                  />
                  <Input
                    label="Date"
                    name="preferDate"
                    type="date"
                    value={form.preferDate}
                    onChange={handleChange}
                  />
                  <Input
                    label="Time"
                    name="preferTime"
                    type="time"
                    value={form.preferTime}
                    onChange={handleChange}
                  />
                  <Input
                    label="Timezone"
                    name="timezone"
                    value={form.timezone}
                    onChange={handleChange}
                    placeholder="Auto-detected from your browser"
                  />
                </div>
                <div className="mt-8">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : "Request demo"}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
