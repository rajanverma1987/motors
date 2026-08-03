"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import { Form, FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import DirectoryListingFormFields from "@/components/directory-listing/DirectoryListingFormFields";
import {
  defaultFormData,
  listingDocumentToFormData,
  buildListingPayloadFromForm,
  buildListingDashboardPatchPayload,
} from "@/lib/directory-listing-constants";
import { useAlert } from "@/components/confirm-provider";

const STATUS_META = {
  "in-review": {
    label: "In review",
    variant: "warning",
    hint: "We’ll email you when your listing is approved. You can still edit details below.",
  },
  pending: {
    label: "In review",
    variant: "warning",
    hint: "We’ll email you when your listing is approved. You can still edit details below.",
  },
  approved: {
    label: "Live",
    variant: "success",
    hint: "Your listing is visible in the directory. Updates save immediately; major changes may be reviewed.",
  },
  rejected: {
    label: "Not approved",
    variant: "danger",
    hint: "Check your email for details. You can update your profile and contact us if you have questions.",
  },
};

export default function SimpleDirectoryListingSection() {
  const alert = useAlert();
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
      .catch(() => {});
  }, [loading, listingId]);

  const updateForm = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGalleryPhotosChange = useCallback((e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setFormData((prev) => ({ ...prev, galleryPhotos: files }));
  }, []);

  const handleLogoFileChange = useCallback(
    (e) => {
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
    },
    [logoPreviewUrl]
  );

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
      await alert({
        title: "Saved",
        message: listingId ? "Directory listing updated." : "Directory listing submitted.",
      });
    } catch (err) {
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusMeta =
    STATUS_META[listingStatus] || (listingStatus ? STATUS_META["in-review"] : null);

  const closeSuggestionModal = () => {
    if (suggestionSubmitting) return;
    setSuggestionOpen(false);
    setSuggestionText("");
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    const text = suggestionText.trim();
    if (!text) {
      await alert({ title: "Suggestions required", message: "Please enter your suggestions." });
      return;
    }
    setSuggestionSubmitting(true);
    try {
      const slugLine = urlSlug
        ? `Live listing path: /electric-motor-repair-shops-listings/${urlSlug}`
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
      await alert({ title: "Thanks", message: "We received your suggestions." });
      setSuggestionOpen(false);
      setSuggestionText("");
    } catch (err) {
      await alert({
        title: "Could not send",
        message: err.message || "Failed to send suggestions",
      });
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <FormContainer>
        <FormSectionTitle as="h2">Directory listing</FormSectionTitle>
        <p className="mb-3 text-sm text-secondary">Your public repair-shop directory profile.</p>
        <div className="flex flex-wrap gap-3 text-sm">
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
            href="/electric-motor-repair-shops-listings"
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
                href={`/electric-motor-repair-shops-listings/${urlSlug}`}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View your live listing
              </Link>
            </>
          ) : null}
        </div>
      </FormContainer>

      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <>
          {statusMeta ? (
            <div className="rounded-none border border-border bg-card px-4 py-3" role="status">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={statusMeta.variant}
                  className="rounded-full px-2.5 py-0.5 text-xs"
                >
                  {statusMeta.label}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-secondary">{statusMeta.hint}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-8">
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

            {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : listingId ? "Save changes" : "Submit listing"}
            </Button>
          </form>
        </>
      )}

      <Modal
        open={suggestionOpen}
        onClose={closeSuggestionModal}
        title="Suggest improvements"
        size="lg"
        actions={
          <Button
            type="submit"
            form="simple-directory-listing-suggestion-form"
            variant="primary"
            size="sm"
            disabled={suggestionSubmitting}
          >
            {suggestionSubmitting ? "Sending…" : "Send"}
          </Button>
        }
      >
        <p className="text-sm text-secondary">
          Tell us what would make your public directory profile clearer, easier to find, or more
          useful for customers. We read every message.
        </p>
        <Form
          id="simple-directory-listing-suggestion-form"
          onSubmit={handleSuggestionSubmit}
          className="mt-4 space-y-4 !space-y-4"
        >
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
