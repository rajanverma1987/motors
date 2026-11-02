"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiLock } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import BrandLogo from "@/components/marketing/brand-logo";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("That reset link is not valid. Request a new one.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update password.");
        return;
      }
      setDone(true);
      window.setTimeout(() => router.replace("/"), 1800);
    } catch (err) {
      setError(err.message || "Could not update password.");
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
              <FiLock className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">Set a new password</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Choose a strong password for your shop portal account.
              </p>
            </div>
          </div>

          {!token ? (
            <div className="space-y-3 text-sm text-neutral-700">
              <p role="alert">This reset link is missing or invalid.</p>
              <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                Request a new reset link
              </Link>
            </div>
          ) : done ? (
            <p className="text-sm text-neutral-700" role="status">
              Password updated. Taking you to sign in…
            </p>
          ) : (
            <Form id="reset-password-form" onSubmit={handleSubmit} className="border-0 bg-transparent p-0 shadow-none sm:p-0">
              <Input
                label="New password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="new-password"
                suffix={
                  <button
                    type="button"
                    className="px-2 text-xs font-medium text-primary hover:underline"
                    onClick={() => setShowPassword((on) => !on)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "View"}
                  </button>
                }
              />
              <Input
                label="Confirm password"
                name="confirm"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                required
                autoComplete="new-password"
              />
              {error ? (
                <p className="mt-4 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-6">
                <Button
                  type="submit"
                  form="reset-password-form"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Update password"}
                </Button>
              </div>
            </Form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-neutral-600">
          Loading…
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
