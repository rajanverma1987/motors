"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import DirectoryListingFormFields from "@/components/directory-listing/DirectoryListingFormFields";
import {
  defaultFormData,
  listingDocumentToFormData,
  buildListingPayloadFromForm,
  buildListingDashboardPatchPayload,
} from "@/lib/directory-listing-constants";
import { useToast } from "@/components/toast-provider";

const STATUS_BADGE = {
  "in-review": {
    label: "In review",
    className:
      "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50",
    hint: "We’ll email you when your listing is approved. You can still edit details below.",
  },
  pending: {
    label: "In review",
    className:
      "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50",
    hint: "We’ll email you when your listing is approved. You can still edit details below.",
  },
  approved: {
    label: "Live",
    className:
      "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-50",
    hint: "Your listing is visible in the directory. Updates save immediately; major changes may be reviewed.",
  },
  rejected: {
    label: "Not approved",
    className:
      "border-red-300 bg-red-100 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
    hint: "Check your email for details. You can update your profile and contact us if you have questions.",
  },
};

export default function DirectoryListingPageClient() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listingId, setListingId] = useState(null);
  const [listingStatus, setListingStatus] = useState(null);
  const [urlSlug, setUrlSlug] = useState("");
  const [formData, setFormData] = useState(() => defaultFormData());
  const [submitError, setSubmitError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoError, setLogoError] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const addressAutoFilled = useRef(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/dashboard/directory-listing", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (data.listing) {
        setListingId(data.listing.id);
        setListingStatus(data.listing.status || "in-review");
        setUrlSlug((data.listing.urlSlug || "").trim());
        setExistingLogoUrl((data.listing.logoUrl || "").trim());
        setFormData(listingDocumentToFormData(data.listing));
      } else {
        setListingId(null);
        setListingStatus(null);
        setUrlSlug("");
        setExistingLogoUrl("");
        setFormData({
          ...defaultFormData(),
          email: (data.accountEmail || "").trim(),
        });
      }
    } catch (e) {
      setSubmitError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || addressAutoFilled.current) return;
    if (listingId) return;
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
  }, [loading, listingId]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (listingId) {
        const payload = buildListingDashboardPatchPayload(formData, listingId);
        fd.append("data", JSON.stringify(payload));
      } else {
        const payload = buildListingPayloadFromForm(formData);
        fd.append("data", JSON.stringify(payload));
      }
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch("/api/dashboard/directory-listing", {
        method: listingId ? "PATCH" : "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      if (data.listing) {
        setListingId(data.listing.id);
        setListingStatus(data.listing.status || "in-review");
        setUrlSlug((data.listing.urlSlug || "").trim());
        setExistingLogoUrl((data.listing.logoUrl || "").trim());
        clearLogo();
        setFormData((prev) => ({
          ...listingDocumentToFormData(data.listing),
          galleryPhotos: prev.galleryPhotos,
        }));
      }
      toast.success(listingId ? "Directory listing updated." : "Directory listing submitted.");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const badge = STATUS_BADGE[listingStatus] || (listingStatus ? STATUS_BADGE["in-review"] : null);

  const closeSuggestionModal = () => {
    if (suggestionSubmitting) return;
    setSuggestionOpen(false);
    setSuggestionText("");
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    const text = suggestionText.trim();
    if (!text) {
      toast.error("Please enter your suggestions.");
      return;
    }
    setSuggestionSubmitting(true);
    try {
      const slugLine = urlSlug
        ? `Live listing path: /electric-motor-reapir-shops-listings/${urlSlug}`
        : "No live listing slug yet (draft or not submitted).";
      const description = `Directory listing — customer suggestions\n\n${slugLine}\n\n---\n\n${text}`;
      const res = await fetch("/api/dashboard/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: "Directory listing — suggestions",
          description,
          category: "other",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send suggestions");
      toast.success("Thanks — we received your suggestions.");
      setSuggestionOpen(false);
      setSuggestionText("");
    } catch (err) {
      toast.error(err.message || "Failed to send suggestions");
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-title">Directory listing</h1>
        <p className="mt-1 text-secondary">
          Create or update the same profile shown on the public repair shop directory. This form matches the website listing flow.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/list-your-electric-motor-services"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open public listing page
          </Link>
          <span className="text-border">·</span>
          <Link
            href="/electric-motor-reapir-shops-listings"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Browse directory
          </Link>
          <span className="text-border">·</span>
          <button
            type="button"
            onClick={() => setSuggestionOpen(true)}
            className="text-left text-primary hover:underline"
          >
            Send suggestions
          </button>
          {urlSlug ? (
            <>
              <span className="text-border">·</span>
              <Link
                href={`/electric-motor-reapir-shops-listings/${urlSlug}`}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View your live listing
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <>
          {badge ? (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${badge.className}`}
              role="status"
            >
              <p className="font-semibold">{badge.label}</p>
              <p className="mt-1 opacity-90">{badge.hint}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-10">
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
              emailReadOnly
              emailHelpText="Tied to your account. Contact support to change it."
            />

            {submitError && <p className="text-sm text-danger">{submitError}</p>}
            <div className="flex flex-wrap gap-4">
              <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                {submitting ? "Saving…" : listingId ? "Save changes" : "Submit listing"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline" size="lg">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </form>
        </>
      )}

      <Modal
        open={suggestionOpen}
        onClose={closeSuggestionModal}
        title="Suggest improvements"
        size="lg"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeSuggestionModal} disabled={suggestionSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="directory-listing-suggestion-form" variant="primary" size="sm" disabled={suggestionSubmitting}>
              {suggestionSubmitting ? "Sending…" : "Send"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary">
          Tell us what would make your public directory profile clearer, easier to find, or more useful for customers. We read every message.
        </p>
        <Form id="directory-listing-suggestion-form" onSubmit={handleSuggestionSubmit} className="mt-4 space-y-4 !space-y-4">
          <Textarea
            label="Your suggestions"
            name="suggestions"
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            rows={6}
            placeholder="e.g. Add a field for…, show certifications on the card, improve map accuracy…"
            required
            maxLength={2000}
          />
        </Form>
      </Modal>
    </div>
  );
}
