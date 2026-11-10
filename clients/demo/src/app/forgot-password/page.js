"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import BrandLogo from "@/components/marketing/brand-logo";

const SUPPORT_EMAIL = "contact@3phaseflow.com";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send reset email.");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1f1c1a]">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Back to sign in">
            <BrandLogo plain className="h-8 w-auto max-w-[10rem] object-contain" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-primary"
          >
            <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiMail className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">Forgot password</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Enter your shop email. If an account exists, we send a reset link from 3PhaseFlow.
              </p>
            </div>
          </div>

          {done ? (
            <div className="space-y-4 text-sm text-neutral-700">
              <p role="status">
                If an account exists for <span className="font-medium text-neutral-900">{email}</span>, a
                reset link is on its way. Check your inbox and spam folder. The link expires in 60
                minutes.
              </p>
              <Link href="/" className="inline-flex font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <Form id="forgot-password-form" onSubmit={handleSubmit} className="border-0 bg-transparent p-0 shadow-none sm:p-0">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
                autoComplete="email"
              />
              {error ? (
                <p className="mt-4 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  type="submit"
                  form="forgot-password-form"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send reset link"}
                </Button>
                <p className="text-center text-sm text-neutral-600">
                  Still stuck?{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Shop portal password help")}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </Form>
          )}
        </div>
      </main>
    </div>
  );
}
