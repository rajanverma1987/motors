"use client";

import { useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";

const FORM_ID = "calculator-estimate-download-form";

const INITIAL = {
  name: "",
  email: "",
  phone: "",
  visitorType: "",
};

const VISITOR_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "end_user", label: "End user (facility / plant / owner)" },
  { value: "motor_repair_shop", label: "Motor repair shop" },
];

export default function CalculatorEstimateDownloadModal({
  open,
  onClose,
  form: calculatorForm,
  sourcePage = "",
}) {
  const [form, setForm] = useState(INITIAL);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL);
    setError("");
    setDownloading(false);
  }, [open]);

  const handleField = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e?.target?.value ?? "" }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!form.visitorType) {
      setError("Please select whether you are an end user or motor repair shop.");
      return;
    }

    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/marketing/calculator-estimate-pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          visitorType: form.visitorType,
          form: calculatorForm,
          sourcePage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate PDF.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "IQMotorBase-Motor-Rewind-Estimate.pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onClose?.();
    } catch (err) {
      setError(err.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Download Detailed Estimate"
      size="md"
    >
      <p className="mb-4 text-sm text-secondary">
        Enter your details to download a PDF with your calculator selections, ballpark estimate, and how the estimate
        was calculated.
      </p>
      <Form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          name="name"
          value={form.name}
          onChange={handleField("name")}
          placeholder="Your name"
          required
          autoComplete="name"
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleField("email")}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleField("phone")}
          placeholder="(555) 555-5555"
          required
          autoComplete="tel"
        />
        <Select
          label="I am a…"
          name="visitorType"
          options={VISITOR_OPTIONS}
          value={form.visitorType}
          onChange={handleField("visitorType")}
          searchable={false}
        />
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full font-semibold shadow-md"
          disabled={downloading}
        >
          <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
          {downloading ? "Generating…" : "Download PDF"}
        </Button>
      </Form>
    </Modal>
  );
}
