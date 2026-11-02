"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import TalentOtpLoginForm from "@/components/talent/talent-otp-login-form";

export default function CareerApplyForm({ slug, headingId = "apply-heading" }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMe(true);
      try {
        const res = await fetch("/api/talent/me", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) setMe(data.profile || null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyWithProfile() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/job-postings/${encodeURIComponent(slug)}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
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
          The shop can review your public talent profile. We emailed you a confirmation. You can apply to
          another role anytime.
        </p>
        <Link href="/talent/profile" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Update your profile
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-5">
      <div>
        <h3 id={headingId} className="text-xl font-semibold text-title sm:text-2xl">
          Apply for this role
        </h3>
        <p className="mt-2 max-w-[57.6rem] text-sm text-secondary sm:text-base">
          Applications require a free talent profile (email OTP sign-in). Shops see your public profile when you
          apply.
        </p>
      </div>

      {loadingMe ? (
        <p className="text-sm text-secondary">Checking sign-in…</p>
      ) : me ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-title">
            Signed in as <span className="font-semibold">{me.fullName || me.email}</span>
          </p>
          <p className="text-xs text-secondary">
            Completeness {me.profileScore || 0}%.{" "}
            <Link href="/talent/profile" className="text-primary hover:underline">
              Edit profile
            </Link>{" "}
            before applying for a stronger application.
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="button"
            variant="primary"
            disabled={submitting || !(me.fullName || "").trim()}
            onClick={() => void applyWithProfile()}
            className="w-full sm:w-auto sm:min-w-[12rem]"
          >
            {submitting ? "Submitting…" : "Apply with profile"}
          </Button>
          {!(me.fullName || "").trim() ? (
            <p className="text-sm text-danger">Add your full name on your profile before applying.</p>
          ) : null}
        </div>
      ) : showLogin ? (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <TalentOtpLoginForm
            redirectTo={`/careers/${slug}#apply`}
            title="Sign in to apply"
            subtitle="Enter your email for a 6-digit code. Creating a free profile takes a minute."
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Button type="button" variant="primary" onClick={() => setShowLogin(true)}>
            Sign in with email to apply
          </Button>
          <p className="text-sm text-secondary">
            New here?{" "}
            <Link href="/talent/login" className="font-medium text-primary hover:underline">
              Create a free talent profile
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
