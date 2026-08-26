"use client";

import { useState, useEffect, useCallback } from "react";
import { FiCheck, FiLock } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Tabs from "@/components/ui/tabs";
import RepairRequestForm from "@/components/marketing/repair-request-form";
import { isValidEmail } from "@/lib/validation";

const sessionKey = (shopId) => `contact_unlocked_${shopId}`;

/**
 * Gated contact reveal for public shop listing pages.
 * Contact data stays in server HTML for SEO; this component controls what users see.
 */
export default function ContactReveal({
  shopId,
  shopSlug,
  shopName,
  shopCity = "",
  shopState = "",
  phone = "",
  email = "",
  website = "",
  address = "",
  listing = null,
}) {
  const hasContact = Boolean(phone || email || website);
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("unlock");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shopId) return;
    try {
      if (sessionStorage.getItem(sessionKey(shopId)) === "true") {
        setUnlocked(true);
      }
    } catch (_) {}
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    const onOpenRequest = (event) => {
      if (String(event?.detail?.shopId || "") !== String(shopId)) return;
      if (unlocked) {
        document.getElementById("listing-contact-reveal")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      setModalTab("unlock");
      setModalOpen(true);
    };
    window.addEventListener("contact-reveal:open", onOpenRequest);
    return () => window.removeEventListener("contact-reveal:open", onOpenRequest);
  }, [shopId, unlocked]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const isValid =
    form.name.trim() !== "" &&
    isValidEmail(form.email) &&
    form.phone.trim().length >= 7;

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setError("");
  }, []);

  const handleUnlock = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads/contact-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          shopSlug,
          shopName,
          city: shopCity,
          state: shopState,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }
      setUnlocked(true);
      setModalOpen(false);
      try {
        sessionStorage.setItem(sessionKey(shopId), "true");
      } catch (_) {}
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasContact) return null;

  const websiteLabel = website ? String(website).replace(/^https?:\/\//i, "").replace(/\/$/, "") : "";

  const repairListing =
    listing ||
    (shopId
      ? {
          id: shopId,
          companyName: shopName,
          city: shopCity,
          state: shopState,
        }
      : null);

  if (unlocked) {
    return (
      <div id="listing-contact-reveal" className="mt-4 rounded-xl border border-success/40 bg-success/10 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-xs text-white">
            <FiCheck className="h-3 w-3" aria-hidden />
          </span>
          Contact info
        </div>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-sm">
          {phone ? (
            <>
              <dt className="text-secondary">Phone</dt>
              <dd className="m-0">
                <a href={`tel:${String(phone).replace(/\D/g, "")}`} className="font-medium text-primary hover:underline">
                  {phone}
                </a>
              </dd>
            </>
          ) : null}
          {email ? (
            <>
              <dt className="text-secondary">Email</dt>
              <dd className="m-0">
                <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">
                  {email}
                </a>
              </dd>
            </>
          ) : null}
          {website ? (
            <>
              <dt className="text-secondary">Website</dt>
              <dd className="m-0">
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-primary hover:underline"
                >
                  {websiteLabel || "Visit website"}
                </a>
              </dd>
            </>
          ) : null}
          {address ? (
            <>
              <dt className="text-secondary">Address</dt>
              <dd className="m-0 text-title">{address}</dd>
            </>
          ) : null}
        </dl>
        <div className="mt-4 border-t border-success/30 pt-4">
          <p className="text-sm text-secondary">Need a quote? Submit your motor details for a faster response.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {
            setModalTab("request");
            setModalOpen(true);
          }}>
            Submit a repair request →
          </Button>
        </div>
        <Modal open={modalOpen} onClose={closeModal} title={`Submit a request to ${shopName}`} size="lg">
          <RepairRequestForm
            mode="shop"
            listing={repairListing}
            city={shopCity}
            state={shopState}
            layout="default"
            className="mx-auto max-w-none border-0 bg-transparent p-0 shadow-none"
          />
        </Modal>
      </div>
    );
  }

  return (
    <>
      <div id="listing-contact-reveal" className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-center sm:p-5">
        <div className="mx-auto mb-4 flex max-w-[12rem] flex-col gap-2" aria-hidden="true">
          <div className="contact-reveal-blur-line contact-reveal-blur-phone" />
          <div className="contact-reveal-blur-line contact-reveal-blur-email" />
          <div className="contact-reveal-blur-line contact-reveal-blur-website" />
        </div>
        <Button type="button" variant="primary" size="md" className="mx-auto w-full max-w-[16rem]" onClick={() => {
          setModalTab("unlock");
          setModalOpen(true);
        }}>
          View contact info
        </Button>
        <p className="mt-2 text-xs text-secondary">Enter your details to reveal phone, email, and website</p>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalTab === "request" ? `Submit a request to ${shopName}` : `Get contact info for ${shopName}`}
        size="lg"
      >
        <Tabs
          tabs={[
            {
              id: "unlock",
              label: "Get contact info",
              children: (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-secondary">
                    Enter your details to reveal {shopName}&apos;s phone, email, and website. We&apos;ll also send you a
                    copy of their contact info.
                  </p>
                  <Input
                    label="Your name *"
                    name="unlockName"
                    autoComplete="name"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                  <Input
                    label="Work email *"
                    name="unlockEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                  <Input
                    label="Phone number *"
                    name="unlockPhone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Best number to reach you"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                  {error ? (
                    <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2 text-xs text-secondary">
                    <FiLock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Your details are only shared with {shopName}
                  </p>
                  <Button type="button" variant="primary" size="lg" className="w-full" disabled={!isValid || submitting} onClick={handleUnlock}>
                    {submitting ? "Revealing contact…" : "Reveal contact info"}
                  </Button>
                  <div className="border-t border-border pt-4 text-center">
                    <p className="text-sm text-secondary">Have a motor repair need? Send your full requirements instead —</p>
                    <button
                      type="button"
                      className="mt-1 text-sm font-semibold text-primary underline underline-offset-2"
                      onClick={() => setModalTab("request")}
                    >
                      Submit a repair request instead →
                    </button>
                  </div>
                </div>
              ),
            },
            {
              id: "request",
              label: "Send repair request",
              children: (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-secondary">
                    Describe your motor and failure — {shopName} will respond directly with a quote.
                  </p>
                  <RepairRequestForm
                    mode="shop"
                    listing={repairListing}
                    city={shopCity}
                    state={shopState}
                    layout="default"
                    className="mx-auto max-w-none border-0 bg-transparent p-0 shadow-none"
                  />
                </div>
              ),
            },
          ]}
          value={modalTab}
          onChange={setModalTab}
          keepMounted
          animatePanel={false}
          panelClassName="flex flex-col pt-4"
          ariaLabel="Contact options"
        />
      </Modal>
    </>
  );
}
