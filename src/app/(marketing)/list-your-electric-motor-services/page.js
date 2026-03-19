"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  FormContainer,
  FormSectionTitle,
} from "@/components/ui/form-layout";
import HeroBackground from "@/components/marketing/HeroBackground";
import DirectoryListingFormFields from "@/components/directory-listing/DirectoryListingFormFields";
import { defaultFormData, buildListingPayloadFromForm } from "@/lib/directory-listing-constants";

function getInitialStepAndEmail() {
  if (typeof sessionStorage === "undefined") return { step: "email", email: "" };
  try {
    const stored = sessionStorage.getItem("listing_verified_email");
    if (stored && stored.trim()) return { step: "form", email: stored.trim() };
  } catch (_) { }
  return { step: "email", email: "" };
}

export default function ListYourCenterPage() {
  const { step: initialStep, email: initialEmail } = getInitialStepAndEmail();
  const [step, setStep] = useState(initialStep); // email | verify | form | done
  const [email, setEmail] = useState(initialEmail);
  const [verificationCode, setVerificationCode] = useState("");
  const [formData, setFormData] = useState(() => ({
    ...defaultFormData(),
    ...(initialEmail ? { email: initialEmail } : {}),
  }));
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoError, setLogoError] = useState("");
  const addressAutoFilled = useRef(false);

  useEffect(() => {
    try {
      const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("listing_verified_email") : null;
      if (stored && stored.trim() && step === "email") {
        setEmail(stored.trim());
        setFormData((prev) => ({ ...prev, email: stored.trim() }));
        setStep("form");
      }
    } catch (_) { }
  }, [step]);

  useEffect(() => {
    if (step !== "form" || addressAutoFilled.current) return;
    addressAutoFilled.current = true;
    fetch("/api/geo", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data || (!data.city && !data.zip && !data.state)) return;
        setFormData((prev) => ({
          ...prev,
          city: data.city ?? prev.city,
          state: data.state ?? prev.state,
          zipCode: data.zip ?? prev.zipCode,
          country: data.country || prev.country,
        }));
      })
      .catch(() => { });
  }, [step]);

  const updateForm = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGalleryPhotosChange = useCallback((e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setFormData((prev) => ({ ...prev, galleryPhotos: files }));
  }, []);

  const handleLogoFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    setLogoError("");
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
    }
    if (!file) {
      setLogoFile(null);
      e.target.value = "";
      return;
    }
    const okType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type);
    if (!okType) {
      setLogoError("Use JPEG, PNG, GIF, or WebP.");
      setLogoFile(null);
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be under 2MB.");
      setLogoFile(null);
      e.target.value = "";
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  }, [logoPreviewUrl]);

  const clearLogo = useCallback(() => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoError("");
  }, [logoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const updateFormBool = useCallback((name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const sendVerificationCode = async () => {
    if (!email.trim()) return;
    setSubmitError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setSubmitError("");
      setStep("verify");
      setVerificationCode("");
    } catch (err) {
      setSubmitError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    setSubmitError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: verificationCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      const verifiedEmail = email.trim();
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("listing_verified_email", verifiedEmail);
      setStep("form");
      setFormData((prev) => ({ ...prev, email: verifiedEmail }));
    } catch (err) {
      setSubmitError(err.message || "Invalid verification code. Please check and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitListing = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const payload = buildListingPayloadFromForm(formData);
      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (logoFile) fd.append("logo", logoFile);
      const res = await fetch("/api/listings", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStep("done");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Step: Email ---
  if (step === "email") {
    return (
      <>
        <section className="relative border-b border-border bg-card py-10 sm:py-14 overflow-hidden">
          <HeroBackground />
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Free directory listing
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
                Get found by customers who need motor repair
              </h1>
              <p className="mt-4 text-lg text-secondary">
                List your center on MotorsWinding.com and show up when people search for repair shops in your area. It’s free to list—you get more visibility and more leads.
              </p>
              <Link
                href="/electric-motor-reapir-shops-listings"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                See how listings look on our directory
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
              <div>
                <h2 className="text-2xl font-bold text-title sm:text-3xl">
                  Why list your center here?
                </h2>
                <ul className="mt-6 space-y-4">
                  <li className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </span>
                    <div>
                      <span className="font-semibold text-title">Get found when customers search</span>
                      <p className="mt-0.5 text-sm text-secondary">Your listing appears when people look for “motor repair near me” or “rewinding shop” in your region—so you reach buyers when they’re ready.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM20.25 8.511c.884.284 1.5 1.008 1.5 1.908v2.388c0 1.024-.921 1.832-1.95 1.918a25.09 25.09 0 01-3.813.475.585.585 0 01-.426-.17L10.5 11.5l-4.461 4.462a.585.585 0 01-.426.17 25.09 25.09 0 01-3.813-.475C1.92 12.756 1 11.948 1 10.924V8.536c0-.9.616-1.624 1.5-1.908V6.75A2.25 2.25 0 014.5 4.5h15A2.25 2.25 0 0121 6.75v1.761z" />
                      </svg>
                    </span>
                    <div>
                      <span className="font-semibold text-title">Qualified repair leads</span>
                      <p className="mt-0.5 text-sm text-secondary">Inquiries come from the MotorsWinding.com network and local search—people who need repair work, not random traffic.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m4.5-18v18M4.5 9.75h15M5.25 6.75h.894a2.25 2.25 0 001.788 0h.007M5.25 6.75H4.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h.007a2.25 2.25 0 001.788 0h.007m0 0h.894m-1.5-1.5v-6.75m0 0H4.5m0 0h.007v6.75" />
                      </svg>
                    </span>
                    <div>
                      <span className="font-semibold text-title">Show what you do best</span>
                      <p className="mt-0.5 text-sm text-secondary">Add your services, capabilities, and photos so customers see why they should choose you—no extra cost to list.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div>
                      <span className="font-semibold text-title">Free to list</span>
                      <p className="mt-0.5 text-sm text-secondary">Get your center in the directory at no charge. You control your listing and can upgrade to paid leads when you’re ready.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div>
                <FormContainer>
                  <FormSectionTitle as="h2">Get started — verify your email</FormSectionTitle>
                  <p className="mb-4 text-sm text-secondary">
                    We’ll send a 6-digit code to this address. Verify once and your listing can go live after you complete your profile.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (email.trim() && !sendingCode) sendVerificationCode();
                    }}
                  >
                    <Input
                      label="Email address"
                      name="email"
                      type="email"
                      placeholder="you@yourcenter.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {submitError && <p className="mt-2 text-sm text-danger">{submitError}</p>}
                    <div className="mt-6">
                      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!email.trim() || sendingCode}>
                        {sendingCode ? "Sending…" : "Send verification code"}
                      </Button>
                    </div>
                  </form>
                </FormContainer>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  // --- Step: Verify code ---
  if (step === "verify") {
    return (
      <>
        <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
          <HeroBackground />
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
              Check your email
            </h1>
            <p className="mt-2 text-secondary">
              We sent a 6-digit code to <strong className="text-title">{email}</strong>. Enter it below.
            </p>
          </div>
        </section>
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-md px-4 sm:px-6">
            <FormContainer>
              <FormSectionTitle as="h2">Step 2: Enter verification code</FormSectionTitle>
              <Input
                label="Verification code"
                name="code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setSubmitError("");
                }}
                maxLength={6}
              />
              {submitError && <p className="mt-2 text-sm text-danger">{submitError}</p>}
              <div className="mt-4 flex flex-col gap-3">
                <Button type="button" variant="primary" size="lg" className="w-full" onClick={verifyCode} disabled={verificationCode.length !== 6 || verifying}>
                  {verifying ? "Verifying…" : "Verify and continue"}
                </Button>
                <button type="button" onClick={() => setStep("email")} className="text-sm text-primary hover:underline">
                  Use a different email
                </button>
              </div>
            </FormContainer>
          </div>
        </section>
      </>
    );
  }

  // --- Step: Done ---
  if (step === "done") {
    return (
      <>
        <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
          <HeroBackground />
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
              Listing submitted
            </h1>
          </div>
        </section>
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <FormContainer>
              <p className="text-secondary">
                Thanks for listing <strong className="text-title">{formData.companyName || "your center"}</strong>. We’ve received your details. Your listing will be reviewed and, once approved, will appear in the directory. We may contact you at <strong className="text-title">{formData.email}</strong> if we need anything.
              </p>
              <div className="mt-8">
                <Link href="/">
                  <Button variant="primary">Back to home</Button>
                </Link>
              </div>
            </FormContainer>
          </div>
        </section>
      </>
    );
  }

  // --- Step: Form (all 2.3 fields) ---
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-8 sm:py-12">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            Email verified: {formData.email}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Center details
          </h1>
          <p className="mt-2 text-secondary">
            Fill in the information below. All fields in the first section are required; the rest help customers find and trust your center.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmitListing} className="py-10 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          <DirectoryListingFormFields
            formData={formData}
            updateForm={updateForm}
            updateFormBool={updateFormBool}
            handleLogoFileChange={handleLogoFileChange}
            logoPreviewUrl={logoPreviewUrl}
            existingLogoUrl=""
            clearLogo={clearLogo}
            logoError={logoError}
            handleGalleryPhotosChange={handleGalleryPhotosChange}
            emailReadOnly
            emailLabel="Email (verified)"
          />

          {submitError && <p className="text-sm text-danger">{submitError}</p>}
          <div className="flex flex-wrap gap-4">
            <Button type="submit" variant="primary" size="lg" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit listing"}
            </Button>
            <Link href="/">
              <Button type="button" variant="outline" size="lg">Cancel</Button>
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
