"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";

export default function TalentOtpLoginForm({
  redirectTo = "/talent/profile",
  title = "Sign in with email",
  subtitle = "We will send a 6-digit code. No password needed. Profiles are free.",
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function sendCode(e) {
    e?.preventDefault?.();
    setError("");
    setInfo("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/talent/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setStep("code");
      setInfo("Code sent. Check your inbox (and spam folder).");
    } catch (err) {
      setError(err.message || "Could not send code");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e) {
    e?.preventDefault?.();
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/talent/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-title sm:text-2xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary">{subtitle}</p>
      </div>
      {step === "email" ? (
        <Form onSubmit={sendCode} className="space-y-4">
          <Input
            label="Email *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" variant="primary" disabled={sending} className="w-full">
            {sending ? "Sending…" : "Send 6-digit code"}
          </Button>
          <p className="text-xs text-secondary">
            New here? Sending a code creates your free account. Existing profiles reopen after verify.
          </p>
        </Form>
      ) : (
        <Form onSubmit={verifyCode} className="space-y-4">
          <Input label="Email" type="email" value={email} disabled />
          <Input
            label="6-digit code *"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            required
          />
          {info ? <p className="text-sm text-secondary">{info}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="submit"
            variant="primary"
            disabled={verifying || code.length !== 6}
            className="w-full"
          >
            {verifying ? "Verifying…" : "Verify and continue"}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={sending} onClick={() => void sendCode()}>
              Resend code
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setStep("email")}>
              Change email
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
