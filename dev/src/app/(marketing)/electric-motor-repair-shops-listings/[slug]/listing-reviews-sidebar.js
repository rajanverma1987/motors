"use client";

import { useState, useEffect, useCallback } from "react";
import { FiCopy } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";

const STAR_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function StarRating({ value, max = 5, size = "sm" }) {
  const num = Math.min(max, Math.max(0, Number(value) || 0));
  const fullStars = Math.round(num);
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" aria-label={`${num} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={`${sizeClass} ${i < fullStars ? "text-amber-500" : "text-muted/50"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

function RatingPicker({ value, onChange, max = 5 }) {
  const sizeClass = "h-6 w-6";
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Choose rating">
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = value >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`rounded p-0.5 transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-card ${value === n ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-card rounded" : ""}`}
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
            aria-pressed={value === n}
          >
            <svg
              className={`${sizeClass} ${filled ? "text-amber-500" : "text-muted/50"}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function formatReviewDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export default function ListingReviewsSidebar({ listingId, listingPagePath = "" }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [copyLinkError, setCopyLinkError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", rating: 5, body: "", website: "" });

  const fetchReviews = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/reviews`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "rating" ? Number(value) : value }));
    setError("");
  };

  const copyListingPageLink = useCallback(async () => {
    setCopyLinkError("");
    const path = (listingPagePath || "").trim();
    if (!path || typeof window === "undefined") return;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const fullUrl = `${window.location.origin}${normalized}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = fullUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 2500);
      } catch {
        setCopyLinkError("Could not copy. Copy the URL from your browser's address bar instead.");
      }
    }
  }, [listingPagePath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: form.authorName,
          authorEmail: form.authorEmail,
          rating: form.rating,
          body: form.body,
          website: form.website,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit review.");
        return;
      }
      setSuccess(true);
      setForm({ authorName: "", authorEmail: "", rating: 5, body: "", website: "" });
      setReviews((prev) => [data, ...prev]);
    } catch {
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="space-y-8">
      <Form onSubmit={handleSubmit} className="p-5">
        <h3 className="font-semibold text-title">Leave a review</h3>
        <p className="mt-1 text-sm text-secondary">Share your experience with this repair center.</p>
        <div className="space-y-4">
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={handleChange}
            className="absolute -left-[9999px]"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
          />
          <Input
            label="Your name"
            name="authorName"
            value={form.authorName}
            onChange={handleChange}
            placeholder="e.g. John Smith"
            required
            minLength={2}
            maxLength={100}
          />
          <Input
            label="Email"
            name="authorEmail"
            type="email"
            value={form.authorEmail}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
          <div>
            <label className="block text-sm font-medium text-title mb-1">Rating</label>
            <RatingPicker value={form.rating} onChange={(n) => setForm((prev) => ({ ...prev, rating: n }))} />
            <input type="hidden" name="rating" value={form.rating} required />
          </div>
          <Textarea
            label="Your review"
            name="body"
            value={form.body}
            onChange={handleChange}
            placeholder="Tell others about your experience…"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400">Thank you! Your review has been posted.</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </Form>

      <div>
        <h2 className="text-lg font-semibold text-title">Customer reviews</h2>
        {loading ? (
          <p className="mt-3 text-sm text-secondary">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-secondary">No reviews yet. Be the first to leave one.</p>
            {listingPagePath ? (
              <>
                <p className="text-sm text-secondary">
                  <span className="font-medium text-title">Own this listing?</span> Copy the link to this page and share
                  it with customers so they can leave a review here.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyListingPageLink}
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <FiCopy className="h-4 w-4 shrink-0" aria-hidden />
                  {linkCopied ? "Link copied" : "Copy link to share"}
                </Button>
                {copyLinkError ? (
                  <p className="text-sm text-danger" role="alert">
                    {copyLinkError}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <StarRating value={r.rating} size="sm" />
                  <span className="text-xs text-secondary">{formatReviewDate(r.createdAt)}</span>
                </div>
                <p className="mt-2 font-medium text-title">{r.authorName}</p>
                <p className="mt-1 text-sm text-secondary">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
