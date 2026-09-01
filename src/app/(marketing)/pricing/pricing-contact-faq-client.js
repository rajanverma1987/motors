"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { loadLeadContact, saveLeadContact } from "@/lib/lead-contact-storage";
import { FOUNDER_SPOTS_TOTAL } from "./pricing-cards-client";

const FAQS = [
  {
    q: "How much does IQMotorBase cost?",
    a: "IQMotorBase costs $349/month on the monthly plan or $3,235/year on the annual plan (equivalent to $269/month, saving $983/year). Both plans include unlimited users and full platform access.",
  },
  {
    q: "What is included in the price?",
    a: "All plans include: job write-ups, work orders, customer and motor registry, inventory, invoicing, AR, vendor POs, QuickBooks Online sync, lead generation directory, marketplace, careers board, and API access. Technician mobile app coming soon.",
  },
  {
    q: "Is there a free trial?",
    a: "We offer a free 20-minute demo rather than a self-serve trial. Book a demo to see the full platform before committing. Most shop owners have everything they need to decide after the demo.",
  },
  {
    q: "What is founder pricing?",
    a: "Founder pricing is a permanently locked discounted rate for the first 10 shops that join IQMotorBase. Your rate never increases as long as you stay subscribed, no matter what the standard price becomes. Contact us to check if spots are still available.",
  },
  {
    q: "How many users are included?",
    a: "Unlimited users on all plans. Add every technician, service writer, and manager at no extra cost.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly plans can be cancelled at the end of any billing period. Annual plans are billed upfront for the year. Contact us if your circumstances change.",
  },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  message: "",
  requestType: "general",
};

export default function PricingContactFaqClient() {
  const [openFaq, setOpenFaq] = useState(null);
  const [contactForm, setContactForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const saved = loadLeadContact();
    if (saved.name || saved.email || saved.phone) {
      setContactForm((prev) => ({
        ...prev,
        name: prev.name || saved.name || "",
        email: prev.email || saved.email || "",
        phone: prev.phone || saved.phone || "",
      }));
    }
  }, []);

  useEffect(() => {
    const onFounderRequest = () => {
      setContactForm((prev) => ({ ...prev, requestType: "founder" }));
    };
    window.addEventListener("pricing-contact-type", onFounderRequest);
    return () => window.removeEventListener("pricing-contact-type", onFounderRequest);
  }, []);

  const setField = (field, value) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
    if (submitError) setSubmitError("");
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name?.trim() || !contactForm.email?.trim()) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/pricing-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send");
      }
      saveLeadContact({
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        id="pricing-contact-form"
        className="scroll-mt-28 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-xl font-bold text-title sm:text-2xl">
          {contactForm.requestType === "founder"
            ? "Request founder pricing"
            : "Have a question before you book?"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
          {contactForm.requestType === "founder"
            ? `You're requesting access to our founder pricing: a permanently locked rate for the first ${FOUNDER_SPOTS_TOTAL} shops. We'll confirm your rate and availability within a few hours.`
            : "Ask us anything: pricing, features, onboarding, or whether IQMotorBase fits your shop. We respond within a few hours."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors touch-manipulation ${
              contactForm.requestType === "founder"
                ? "border-warning bg-warning/10 text-title"
                : "border-border text-secondary hover:bg-muted"
            }`}
            onClick={() => setField("requestType", "founder")}
          >
            Request founder pricing
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors touch-manipulation ${
              contactForm.requestType === "general"
                ? "border-primary bg-primary/10 text-title"
                : "border-border text-secondary hover:bg-muted"
            }`}
            onClick={() => setField("requestType", "general")}
          >
            General question
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Your name *"
                name="name"
                value={contactForm.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Full name"
                required
                autoComplete="name"
              />
              <Input
                label="Work email *"
                name="email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@yourshop.com"
                required
                autoComplete="email"
              />
            </div>
            <Input
              label="Phone number"
              name="phone"
              type="tel"
              value={contactForm.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="Best number to reach you"
              autoComplete="tel"
            />
            <Textarea
              label={
                contactForm.requestType === "founder"
                  ? "Tell us about your shop (optional)"
                  : "Your question"
              }
              name="message"
              rows={contactForm.requestType === "founder" ? 3 : 4}
              value={contactForm.message}
              onChange={(e) => setField("message", e.target.value)}
              placeholder={
                contactForm.requestType === "founder"
                  ? "Shop name, location, how many jobs per month, anything that helps us understand your situation."
                  : "What would you like to know about IQMotorBase?"
              }
            />
            {submitError ? (
              <p className="text-sm text-danger" role="alert">
                {submitError}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!contactForm.name?.trim() || !contactForm.email?.trim() || submitting}
              className={contactForm.requestType === "founder" ? "bg-warning hover:opacity-90" : ""}
            >
              {submitting
                ? "Sending…"
                : contactForm.requestType === "founder"
                  ? "Request founder pricing →"
                  : "Send my question →"}
            </Button>
            <p className="text-xs text-secondary">
              We respond within a few hours during business hours. Your details are never shared or sold.
            </p>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-xl font-bold text-success">
              ✓
            </div>
            <h3 className="mt-4 text-lg font-semibold text-title">
              {contactForm.requestType === "founder"
                ? "Request received. We'll be in touch shortly"
                : "Got your question. We'll reply soon"}
            </h3>
            <p className="mt-2 text-sm text-secondary">
              {contactForm.requestType === "founder"
                ? "We'll confirm your founder rate and availability within a few hours. In the meantime, book a demo to see the platform:"
                : "While you wait, book a free demo to see IQMotorBase in action:"}
            </p>
            <Link href="/contact" className="mt-4 inline-block">
              <Button type="button" variant="primary" size="md">
                Book a free 20-minute demo →
              </Button>
            </Link>
          </div>
        )}
      </div>

      <section aria-labelledby="faq-pricing-heading" className="mt-12">
        <h2 id="faq-pricing-heading" className="text-xl font-bold text-title sm:text-2xl">
          Pricing questions
        </h2>
        <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
          {FAQS.map((faq, i) => {
            const open = openFaq === i;
            return (
              <div key={faq.q} className="px-4 sm:px-5">
                <dt>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-title touch-manipulation sm:text-base"
                    aria-expanded={open}
                    aria-controls={`faq-pricing-${i}`}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <span className="shrink-0 text-lg text-secondary" aria-hidden>
                      {open ? "−" : "+"}
                    </span>
                  </button>
                </dt>
                <dd
                  id={`faq-pricing-${i}`}
                  hidden={!open}
                  className="pb-4 text-sm leading-relaxed text-secondary"
                >
                  {faq.a}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </>
  );
}
