"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { Form } from "@/components/ui/form-layout";
import HeroBackground from "@/components/marketing/HeroBackground";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, mounted } = useAuth();
  const [step, setStep] = useState("email"); // email | verify | form
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({
    shopName: "",
    contactName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (user) router.replace("/dashboard");
  }, [mounted, user, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const sendVerificationCode = async () => {
    if (!email.trim()) return;
    setError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setError("");
      setStep("verify");
      setVerificationCode("");
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: verificationCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setStep("form");
      setForm((prev) => ({ ...prev, email: email.trim() }));
    } catch (err) {
      setError(err.message || "Invalid verification code. Please check and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await register(form.shopName, form.contactName, form.email, form.password);
      if (result.ok) {
        router.push("/dashboard");
        return;
      }
      setError(result.error || "Registration failed.");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  const leftColumn = (
    <div>
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <span className="font-semibold text-primary">One month free trial</span>
        <span className="text-secondary"> — no credit card required. Full access to the portal.</span>
      </div>
      <p className="mt-5 text-base text-secondary">
        Create your MotorsWinding.com account to log in to your portal, manage work orders,
        and see new repair leads in one place.
      </p>
      <ul className="mt-6 space-y-3 text-sm text-secondary">
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>
            One login for{" "}
            <span className="font-medium text-title">work orders, quotes, and invoicing</span> so your team
            always works from the same system.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>
            Access your{" "}
            <span className="font-medium text-title">job board, customers, and motor history</span> from
            anywhere.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>
            Connect to your{" "}
            <span className="font-medium text-title">existing CRM or tools with the API</span> and upload
            your existing data when you&apos;re ready.
          </span>
        </li>
      </ul>
      <p className="mt-6 text-sm text-secondary">
        Already using another system? Start by registering your center, then we can help you import customers,
        motors, and open jobs.
      </p>
    </div>
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
            One month free trial — no credit card required
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Register your center
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-secondary">
            Create your account in a few steps. We&apos;ll verify your email first, then you&apos;ll add your center name and set a password. Once you&apos;re in, you get access to the portal—work orders, quotes, customers, and repair leads in one place.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            {leftColumn}

            <div>
              {/* Step 1: Enter email */}
              {step === "email" && (
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email.trim() && !sendingCode) sendVerificationCode();
                  }}
                  className="bg-card/80 shadow-sm backdrop-blur sm:p-8"
                >
                  <h2 className="text-lg font-semibold text-title">Verify your email</h2>
                  <p className="mt-1 text-sm text-secondary mb-4">
                    We&apos;ll send a 6-digit code to this address. Enter it on the next step to continue.
                  </p>
                  <Input
                    label="Email address"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                  <div className="mt-6">
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!email.trim() || sendingCode}>
                      {sendingCode ? "Sending…" : "Send verification code"}
                    </Button>
                  </div>
                  <p className="mt-6 text-center text-sm text-secondary">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                      Log in
                    </Link>
                  </p>
                </Form>
              )}

              {/* Step 2: Enter verification code */}
              {step === "verify" && (
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (verificationCode.length === 6 && !verifying) verifyCode();
                  }}
                  className="bg-card/80 shadow-sm backdrop-blur sm:p-8"
                >
                  <h2 className="text-lg font-semibold text-title">Check your email</h2>
                  <p className="mt-1 text-sm text-secondary mb-4">
                    We sent a 6-digit code to <strong className="text-title">{email}</strong>. Enter it below.
                  </p>
                  <Input
                    label="Verification code"
                    name="code"
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                  {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                  <div className="mt-4 flex flex-col gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={verificationCode.length !== 6 || verifying}
                    >
                      {verifying ? "Verifying…" : "Verify and continue"}
                    </Button>
                    <button type="button" onClick={() => setStep("email")} className="text-sm text-primary hover:underline">
                      Use a different email
                    </button>
                  </div>
                </Form>
              )}

              {/* Step 3: Registration form */}
              {step === "form" && (
                <Form
                  onSubmit={handleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  className="bg-card/80 shadow-sm backdrop-blur sm:p-8"
                >
                    <Input
                      label="Center name"
                      name="shopName"
                      type="text"
                      placeholder="e.g. Acme Motor Center"
                      value={form.shopName}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Your name"
                      name="contactName"
                      type="text"
                      placeholder="Contact person"
                      value={form.contactName}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Email (verified)"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      readOnly
                    />
                    <Input
                      label="Password"
                      name="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Confirm password"
                      name="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  {error && (
                    <p className="mt-4 text-sm text-danger" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="mt-6 flex flex-col gap-3">
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                      {submitting ? "Creating account…" : "Create account"}
                    </Button>
                    <p className="text-center text-sm text-secondary">
                      Already have an account?{" "}
                      <Link href="/login" className="font-medium text-primary hover:underline">
                        Log in
                      </Link>
                    </p>
                  </div>
                </Form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
