"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";

export default function CareerApplyForm({ slug, headingId = "apply-heading" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (experience.trim().length < 20) {
      setError("Please enter at least 20 characters about your experience.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/job-postings/${encodeURIComponent(slug)}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName: name.trim(),
          applicantEmail: email.trim(),
          applicantPhone: phone.trim(),
          experienceText: experience.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit application");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-6 text-center">
        <p className="font-semibold text-title">Application received</p>
        <p className="mt-2 text-sm text-secondary">
          The shop will contact you if there&apos;s a fit. You can close this page or apply to another role.
        </p>
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit} className="w-full max-w-none space-y-5">
      <div>
        <h3 id={headingId} className="text-xl font-semibold text-title sm:text-2xl">
          Apply for this role
        </h3>
        <p className="mt-2 max-w-3xl text-sm text-secondary sm:text-base">
          Enter your contact details and a short summary of your relevant experience (motor repair, rewinding, electrical,
          machining, etc.).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Full name *" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        <Input
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div className="sm:col-span-2 lg:col-span-1">
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>
      </div>
      <Textarea
        label="Experience *"
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
        rows={8}
        placeholder="Years in trade, certifications, equipment you’ve worked on, shift availability…"
        required
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-auto sm:min-w-[12rem]">
        {submitting ? "Submitting…" : "Submit application"}
      </Button>
    </Form>
  );
}
