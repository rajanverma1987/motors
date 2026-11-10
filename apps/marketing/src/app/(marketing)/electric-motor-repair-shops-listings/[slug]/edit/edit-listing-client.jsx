"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import DirectoryListingFormFields from "@/components/directory-listing/DirectoryListingFormFields";
import {
  buildListingDashboardPatchPayload,
  listingDocumentToFormData,
} from "@/lib/directory-listing-constants";
import { useAlert, useConfirm } from "@/components/confirm-provider";

const FORM_ID = "listing-owner-edit-form";

export default function EditListingClient({ slug, companyName }) {
  const alert = useAlert();
  const confirm = useConfirm();
  const [phase, setPhase] = useState("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [listing, setListing] = useState(null);
  const [formData, setFormData] = useState(() => listingDocumentToFormData(null));
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoError, setLogoError] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [removedGallery, setRemovedGallery] = useState([]);

  const fillFromListing = useCallback((data) => {
    const formSource = data?.form
      ? {
          ...data.form,
          email: data.form.email,
          logoUrl: data.logoUrl,
          galleryPhotoUrls: data.galleryPhotoUrls,
          companyName: data.form.companyName || data.companyName,
          status: data.status,
        }
      : data;
    setListing(data);
    setExistingLogoUrl(String(data?.logoUrl || "").trim());
    setRemovedGallery([]);
    setFormData({
      ...listingDocumentToFormData(formSource),
      galleryPhotos: [],
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listings/owner-edit?slug=${encodeURIComponent(slug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.authenticated && data.listing) {
          fillFromListing(data.listing);
          setPhase("editor");
        } else {
          setPhase("email");
        }
      } catch {
        if (!cancelled) setPhase("email");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, fillFromListing]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const updateForm = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateFormBool = useCallback((name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const handleGalleryPhotosChange = useCallback((e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const accepted = [];
    for (const file of files) {
      if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) continue;
      accepted.push(file);
    }
    setFormData((prev) => ({ ...prev, galleryPhotos: accepted.slice(0, 8) }));
    if (files.length > 0 && accepted.length !== files.length) {
      setError("Photos must be JPEG, PNG, GIF, or WebP, under 2MB. Up to 8 at a time.");
    } else {
      setError("");
    }
  }, []);

  const handleLogoFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      setLogoError("");
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
      if (!file) {
        setLogoFile(null);
        e.target.value = "";
        return;
      }
      const okType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type);
      if (!okType || file.size > 2 * 1024 * 1024) {
        setLogoError(okType ? "Logo must be under 2MB." : "Use JPEG, PNG, GIF, or WebP.");
        setLogoFile(null);
        e.target.value = "";
        return;
      }
      setLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
      e.target.value = "";
    },
    [logoPreviewUrl]
  );

  const clearLogo = useCallback(() => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoError("");
  }, [logoPreviewUrl]);

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
      const res = await fetch("/api/listings/owner-edit/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setEmail(trimmed);
      setPhase("code");
      setCode("");
      setInfo("Code sent. Check your inbox and spam folder.");
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
      const res = await fetch("/api/listings/owner-edit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      fillFromListing(data.listing);
      setPhase("editor");
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function signOut() {
    await fetch("/api/listings/owner-edit/logout", { method: "POST", credentials: "include" });
    setListing(null);
    setPhase("email");
    setCode("");
    setInfo("");
    setError("");
  }

  async function removeGallery(url) {
    const ok = await confirm({
      title: "Remove photo",
      message: "Remove this photo from the listing when you save?",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    setRemovedGallery((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = buildListingDashboardPatchPayload(formData, listing?.id);
      payload.slug = slug;
      payload.removeGalleryUrls = removedGallery;
      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (logoFile) fd.append("logo", logoFile);
      for (const file of formData.galleryPhotos || []) {
        fd.append("gallery", file);
      }
      const res = await fetch("/api/listings/owner-edit", {
        method: "PATCH",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.listing) fillFromListing(data.listing);
      clearLogo();
      await alert({ title: "Saved", message: "Your directory listing was updated." });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = companyName || "your listing";
  const visibleGallery = (listing?.galleryPhotoUrls || []).filter((url) => !removedGallery.includes(url));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {phase === "checking" ? <p className="text-sm text-secondary">Loading…</p> : null}

      {phase === "email" || phase === "code" ? (
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-title">Edit {title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Enter the email address on this listing. We will send a 6-digit code. No account is created.
          </p>
          {phase === "email" ? (
            <Form onSubmit={sendCode} className="mt-6">
              <Input
                label="Listing email *"
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
            </Form>
          ) : (
            <Form onSubmit={verifyCode} className="mt-6">
              <Input label="Email" type="email" value={email} readOnly />
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
              <Button type="submit" variant="primary" disabled={verifying || code.length !== 6} className="w-full">
                {verifying ? "Verifying…" : "Verify and edit listing"}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={sending} onClick={() => void sendCode()}>
                  Resend code
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPhase("email")}>
                  Change email
                </Button>
              </div>
            </Form>
          )}
          <p className="mt-4 text-sm">
            <Link href={`/electric-motor-repair-shops-listings/${slug}`} className="text-primary hover:underline">
              Back to listing
            </Link>
          </p>
        </div>
      ) : null}

      {phase === "editor" && listing ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-title">Edit {listing.companyName || title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                  Live
                </Badge>
                <Link
                  href={`/electric-motor-repair-shops-listings/${slug}`}
                  className="text-sm text-primary hover:underline"
                >
                  View public listing
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
              <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>

          <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-8">
            <DirectoryListingFormFields
              formData={formData}
              updateForm={updateForm}
              updateFormBool={updateFormBool}
              handleLogoFileChange={handleLogoFileChange}
              logoPreviewUrl={logoPreviewUrl}
              existingLogoUrl={existingLogoUrl}
              clearLogo={clearLogo}
              logoError={logoError}
              handleGalleryPhotosChange={handleGalleryPhotosChange}
              existingGalleryUrls={visibleGallery}
              onRemoveGallery={removeGallery}
              emailReadOnly
              emailHelpText="This is the listing email. Contact us if it needs to change."
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
