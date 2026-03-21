"use client";

import { useState } from "react";

/**
 * Capture buyer requirements on the marketplace.
 * `variant="empty"` — no listings (full intro).
 * `variant="belowListings"` — under results (“didn’t find…” heading lives on the page).
 */
export default function MarketplaceEmptyWantForm({
  searchQuery = "",
  categoryFilter = "",
  categoryDisplayLabel = "",
  variant = "empty",
}) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [requirements, setRequirements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/want-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName,
          buyerEmail,
          buyerPhone,
          requirements,
          searchQuery,
          categoryFilter,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setDone(true);
      setBuyerName("");
      setBuyerEmail("");
      setBuyerPhone("");
      setRequirements("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="font-semibold text-title">Thanks — we received your request</p>
        <p className="mt-2 text-sm text-secondary">
          Our team will review what you need and reach out by email. You can also try different search keywords or
          categories above.
        </p>
      </div>
    );
  }

  const isBelowListings = variant === "belowListings";

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
      {isBelowListings ? (
        <>
          <p className="text-sm text-secondary">
            Tell us what you need and our team will try to help source parts, motors, or equipment—we&apos;ll reach out
            by email.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-title">Tell us what you&apos;re looking for</h2>
          <p className="mt-1 text-sm text-secondary">
            No listings matched your search. Submit your requirements and we&apos;ll try to help source parts, motors,
            or equipment.
          </p>
        </>
      )}
      {searchQuery || categoryDisplayLabel ? (
        <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-secondary">
          {searchQuery ? (
            <>
              <span className="font-medium text-title">Search:</span> {searchQuery}
            </>
          ) : null}
          {searchQuery && categoryDisplayLabel ? " · " : null}
          {categoryDisplayLabel ? (
            <>
              <span className="font-medium text-title">Category:</span> {categoryDisplayLabel}
            </>
          ) : null}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="mp-want-name" className="mb-1 block text-sm font-medium text-title">
            Name
          </label>
          <input
            id="mp-want-name"
            type="text"
            required
            autoComplete="name"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
          />
        </div>
        <div>
          <label htmlFor="mp-want-email" className="mb-1 block text-sm font-medium text-title">
            Email
          </label>
          <input
            id="mp-want-email"
            type="email"
            required
            autoComplete="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
          />
        </div>
        <div>
          <label htmlFor="mp-want-phone" className="mb-1 block text-sm font-medium text-title">
            Phone <span className="font-normal text-secondary">(optional)</span>
          </label>
          <input
            id="mp-want-phone"
            type="tel"
            autoComplete="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
          />
        </div>
        <div>
          <label htmlFor="mp-want-req" className="mb-1 block text-sm font-medium text-title">
            What do you need?
          </label>
          <textarea
            id="mp-want-req"
            required
            minLength={10}
            rows={5}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Part numbers, motor HP/voltage, quantity, timeline, location…"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
