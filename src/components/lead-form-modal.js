"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";

const URGENCY_OPTIONS = [
  { value: "", label: "Select urgency…" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

const INITIAL_FORM = {
  name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  zipCode: "",
  motorType: "",
  motorHp: "",
  voltage: "",
  problemDescription: "",
  urgencyLevel: "",
};

export default function LeadFormModal({ open, onClose, listing = null }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [motorPhotoFiles, setMotorPhotoFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let motorPhotos = [];
      if (motorPhotoFiles.length > 0) {
        const fd = new FormData();
        motorPhotoFiles.forEach((f) => fd.append("files", f));
        const upRes = await fetch("/api/leads/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Photo upload failed");
        motorPhotos = upData.urls || [];
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          city: form.city,
          zipCode: form.zipCode,
          motorType: form.motorType,
          motorHp: form.motorHp,
          voltage: form.voltage,
          problemDescription: form.problemDescription,
          urgencyLevel: form.urgencyLevel,
          motorPhotos,
          listingId: listing?.id ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSubmitted(true);
      setForm(INITIAL_FORM);
      setMotorPhotoFiles([]);
    } catch (err) {
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSubmitted(false);
    setMotorPhotoFiles([]);
  };

  const introText = listing
    ? `Submit your repair requirement. It will be sent to ${listing.companyName}.`
    : "Submit your repair requirement. We'll match you with repair centers in your area.";

  return (
    <Modal open={open} onClose={handleClose} title="Send your requirement" size="4xl">
      {submitted ? (
        <div className="py-4 text-center">
          <p className="text-title font-medium">Thank you for your request.</p>
          <p className="mt-2 text-sm text-secondary">
            Your requirement has been submitted. {listing ? "The repair center will be in touch." : "We'll match you with repair centers and get back to you."}
          </p>
          <Button variant="outline" className="mt-6" onClick={handleClose}>
            Close
          </Button>
        </div>
      ) : (
        <Form onSubmit={handleSubmit} className="flex flex-col gap-5 !space-y-0">
          <p className="text-sm text-secondary">{introText}</p>

          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Input
                label="Your name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Company Name"
                name="company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Input
                label="City / location"
                name="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <Input
                label="Zip code"
                name="zipCode"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="e.g. 12345"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
              Motor details
            </h3>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              <Input
                label="Motor type"
                name="motorType"
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value }))}
                placeholder="e.g. AC induction, DC"
              />
              <Input
                label="Motor HP"
                name="motorHp"
                value={form.motorHp}
                onChange={(e) => setForm((f) => ({ ...f, motorHp: e.target.value }))}
                placeholder="e.g. 50 HP"
              />
              <Input
                label="Voltage"
                name="voltage"
                value={form.voltage}
                onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <div className="col-span-2">
                <Select
                  label="Urgency level"
                  name="urgencyLevel"
                  options={URGENCY_OPTIONS}
                  value={form.urgencyLevel}
                  onChange={(e) => setForm((f) => ({ ...f, urgencyLevel: e.target.value }))}
                  searchable={false}
                />
              </div>
              <div>
                <label className="text-sm text-title">Motor photos (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-sm text-text file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-white"
                  onChange={(e) => setMotorPhotoFiles(Array.from(e.target.files || []))}
                />
                {motorPhotoFiles.length > 0 && (
                  <p className="mt-0.5 text-xs text-secondary">{motorPhotoFiles.length} file(s)</p>
                )}
              </div>
              <div className="col-span-3">
                <Textarea
                  label="Problem description"
                  name="problemDescription"
                  value={form.problemDescription}
                  onChange={(e) => setForm((f) => ({ ...f, problemDescription: e.target.value }))}
                  placeholder="Describe the issue, symptoms, timeline, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
