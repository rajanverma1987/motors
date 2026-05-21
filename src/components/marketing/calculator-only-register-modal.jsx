"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/toast-provider";
import { CALCULATORS_SUBSCRIBE_PATH } from "@/lib/calculator-auth-flow";

const FORM_ID = "calculator-only-register-form";

/**
 * In-page signup for calculators-only accounts (not full CRM / repair shop portal).
 */
export default function CalculatorOnlyRegisterModal({ open, onClose, nextPath = CALCULATORS_SUBSCRIBE_PATH, onRegistered }) {
  const { register } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [portalExists, setPortalExists] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    contactName: "",
    password: "",
    confirmPassword: "",
  });

  function resetAndClose() {
    if (submitting || sendingCode || verifying) return;
    setStep("email");
    setEmail("");
    setVerificationCode("");
    setError("");
    setPortalExists(false);
    setForm({ displayName: "", contactName: "", password: "", confirmPassword: "" });
    onClose();
  }

  async function sendVerificationCode(e) {
    e?.preventDefault();
    if (!email.trim() || sendingCode) return;
    setError("");
    setPortalExists(false);
    setSendingCode(true);
    try {
      const checkRes = await fetch("/api/calculators/account/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const checkData = await checkRes.json();
      if (checkRes.ok && checkData.portalAccountExists) {
        setPortalExists(true);
        return;
      }
      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setStep("verify");
      setVerificationCode("");
    } catch (err) {
      setError(err.message || "Could not send verification code.");
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyCode(e) {
    e?.preventDefault();
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
      setStep("details");
    } catch (err) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e) {
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
      const shopName = form.displayName.trim() || form.contactName.trim() || "Calculators subscriber";
      const result = await register(shopName, form.contactName.trim() || shopName, email.trim(), form.password, {
        calculatorOnly: true,
      });
      if (result.ok) {
        toast.success("Account created — complete monthly subscription to unlock calculators.");
        setStep("email");
        setEmail("");
        setVerificationCode("");
        setError("");
        setPortalExists(false);
        setForm({ displayName: "", contactName: "", password: "", confirmPassword: "" });
        onClose();
        onRegistered?.();
        return;
      }
      if (String(result.error || "").toLowerCase().includes("already exists")) {
        setPortalExists(true);
        setStep("email");
        setError("");
        return;
      }
      setError(result.error || "Registration failed.");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || sendingCode || verifying;

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Create calculators-only account"
      size="md"
      zIndex={120}
      actions={
        step === "email" ? (
          <>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={resetAndClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="calculator-only-email-form"
              variant="primary"
              size="sm"
              disabled={busy || !email.trim() || portalExists}
            >
              {sendingCode ? "Sending…" : "Send code"}
            </Button>
          </>
        ) : step === "verify" ? (
          <>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setStep("email")}>
              Back
            </Button>
            <Button type="submit" form="calculator-only-verify-form" variant="primary" size="sm" disabled={busy}>
              {verifying ? "Checking…" : "Continue"}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={busy}>
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4 text-sm text-secondary">
        <p className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2.5 text-xs leading-relaxed">
          This creates a <strong className="text-title">calculators-only</strong> login—not a full repair-shop CRM account.
          After signup you will only see the <strong className="text-title">Calculators</strong> area, not leads, work orders,
          or inventory.
        </p>

        {step === "email" ? (
          <Form id="calculator-only-email-form" onSubmit={sendVerificationCode} className="!space-y-3">
            <Input
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPortalExists(false);
                setError("");
              }}
              placeholder="you@example.com"
              required
            />
            {portalExists ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                An account with this email already exists. Log in instead—if you have a full shop CRM account, use that
                login; otherwise contact us if you need help.
              </p>
            ) : null}
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </Form>
        ) : null}

        {step === "verify" ? (
          <Form id="calculator-only-verify-form" onSubmit={verifyCode} className="!space-y-3">
            <p className="text-xs">
              Enter the 6-digit code sent to <span className="font-medium text-title">{email}</span>.
            </p>
            <Input
              label="Verification code"
              name="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              required
            />
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </Form>
        ) : null}

        {step === "details" ? (
          <Form id={FORM_ID} onSubmit={handleSubmit} className="!space-y-3">
            <Input
              label="Your name"
              name="contactName"
              value={form.contactName}
              onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
              placeholder="e.g. Alex Rivera"
              required
            />
            <Input
              label="Company or label (optional)"
              name="displayName"
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              placeholder="e.g. Your shop or personal use"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
            />
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </Form>
        ) : null}
      </div>
    </Modal>
  );
}
