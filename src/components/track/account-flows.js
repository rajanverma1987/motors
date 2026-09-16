"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";

/** Strips a handled query param without a full page reload. */
function clearParam(key) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Handles the two emailed links that land back on /Track:
 * ?verify=<token> confirms an email address, ?reset=<token> sets a new password.
 */
export function TrackAccountLinkHandler() {
  const toast = useToast();
  const { token, refreshSession } = useTrackAuth();
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    const reset = params.get("reset");
    if (reset) {
      setResetToken(reset);
      clearParam("reset");
    }
    if (verify) {
      clearParam("verify");
      appFetch("/api/track/auth/verify-email", { method: "POST", body: { token: verify } })
        .then(() => {
          toast.success("Email verified. You can send RFQs now.");
          if (token) refreshSession().catch(() => {});
        })
        .catch((err) => toast.error(err.message || "That verification link is not valid."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await appFetch("/api/track/auth/password-reset", {
        method: "PUT",
        body: { token: resetToken, password },
      });
      toast.success("Password updated. Sign in with your new password.");
      setResetToken("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(resetToken)}
      onClose={() => setResetToken("")}
      title="Set a new password"
      size="sm"
      actions={
        <>
          <Button type="button" size="sm" variant="outline" onClick={() => setResetToken("")}>
            Cancel
          </Button>
          <Button type="submit" form="track-reset-form" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </Button>
        </>
      }
    >
      <Form id="track-reset-form" onSubmit={submitReset} className="space-y-3">
        <Input
          label="New password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label="Confirm new password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </Form>
    </Modal>
  );
}

/** §9.4 - unverified accounts can browse, but not send RFQs. */
export function TrackVerifyBanner() {
  const toast = useToast();
  const { token, session, refreshSession } = useTrackAuth();
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!session || session.emailVerified !== false) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await appFetch("/api/track/auth/verify-email", { token, method: "PUT" });
      toast.success("Verification email sent.");
    } catch (err) {
      toast.error(err.message || "Could not send the email.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await appFetch("/api/track/auth/verify-email", {
        token,
        method: "POST",
        body: { code: code.trim() },
      });
      toast.success("Email verified.");
      setCodeOpen(false);
      setCode("");
      await refreshSession().catch(() => {});
    } catch (err) {
      toast.error(err.message || "That code is not valid.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="border-b border-warning/40 bg-warning/10 px-4 py-2">
        <p className="text-[11px] text-title">
          Verify your email to send RFQs to repair shops. We sent a link and a 6 digit code to{" "}
          {session.email}.
        </p>
        <div className="mt-1.5 flex gap-1.5">
          <Button type="button" size="sm" onClick={() => setCodeOpen(true)}>
            Enter code
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={resend}>
            {busy ? "Sending…" : "Resend email"}
          </Button>
        </div>
      </div>

      <Modal
        open={codeOpen}
        onClose={() => setCodeOpen(false)}
        title="Verify your email"
        size="sm"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setCodeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="track-verify-form" size="sm" disabled={busy}>
              {busy ? "Checking…" : "Verify"}
            </Button>
          </>
        }
      >
        <Form id="track-verify-form" onSubmit={submitCode} className="space-y-3">
          <Input
            label="6 digit code"
            name="verify-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="123456"
            required
          />
        </Form>
      </Modal>
    </>
  );
}

/** Forgot password entry point used from the sign in screen. */
export function TrackForgotPasswordModal({ open, onClose }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await appFetch("/api/track/auth/password-reset", {
        method: "POST",
        body: { email: email.trim() },
      });
      toast.success("If that email is registered, a reset link is on its way.");
      setEmail("");
      onClose();
    } catch (err) {
      toast.error(err.message || "Could not send the reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset your password"
      size="sm"
      actions={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="track-forgot-form" size="sm" disabled={busy}>
            {busy ? "Sending…" : "Send link"}
          </Button>
        </>
      }
    >
      <Form id="track-forgot-form" onSubmit={submit} className="space-y-3">
        <Input
          label="Email"
          name="forgot-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@plant.com"
          required
        />
      </Form>
    </Modal>
  );
}
