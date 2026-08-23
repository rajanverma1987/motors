"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { isValidEmail } from "@/lib/validation";

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select motor type…" },
  { value: "AC Motor (Three-phase)", label: "AC Motor (Three-phase)" },
  { value: "AC Motor (Single-phase)", label: "AC Motor (Single-phase)" },
  { value: "DC Motor", label: "DC Motor" },
  { value: "Servo Motor", label: "Servo Motor" },
  { value: "High Voltage Motor (above 4kV)", label: "High Voltage Motor (above 4kV)" },
  { value: "Generator", label: "Generator" },
  { value: "Pump Motor", label: "Pump Motor" },
  { value: "Other / Not Sure", label: "Other / Not Sure" },
];

const CAN_SHIP_LABELS = {
  yes: "Yes — can ship or drop off",
  pickup: "Need pickup / field service",
  either: "Either works",
};

const INITIAL_FORM = {
  motorType: "",
  horsepower: "",
  voltage: "",
  urgency: "standard",
  failureDescription: "",
  canShip: "",
  name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  state: "",
};

function buildProblemDescription(failureDescription, canShip) {
  const desc = String(failureDescription || "").trim();
  if (!canShip || !CAN_SHIP_LABELS[canShip]) return desc;
  return `[Delivery: ${CAN_SHIP_LABELS[canShip]}]\n\n${desc}`;
}

/**
 * Inline repair request form for directory / location / shop listing pages.
 * @param {{ mode: 'city' | 'shop', city?: string, state?: string, zipCode?: string, listing?: { id: string, companyName?: string } | null, defaultUrgency?: 'standard' | 'emergency', defaultIndustry?: string, formHeading?: string, className?: string }} props
 */
export default function RepairRequestForm({
  mode = "city",
  city = "",
  state = "",
  zipCode = "",
  listing = null,
  defaultUrgency = "standard",
  defaultIndustry = "",
  formHeading = "",
  className = "",
}) {
  const lockUrgency = defaultUrgency === "emergency";
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    city: city || "",
    state: state || "",
    urgency: defaultUrgency === "emergency" ? "emergency" : "standard",
  });
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const shopName = listing?.companyName || "";
  const listingId = listing?.id != null ? String(listing.id).trim() : "";
  const isEmergency = form.urgency === "emergency";
  const showLocationFields = mode !== "shop" && !city;
  const locationLabel = [city || form.city, state || form.state].filter(Boolean).join(", ");

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const step1Valid = form.motorType !== "" && form.failureDescription.trim().length >= 20;
  const step2Valid = form.name.trim() !== "" && form.email.trim() !== "" && isValidEmail(form.email);

  const handleSubmit = async () => {
    if (!step2Valid) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          city: (form.city || city || "").trim(),
          state: (form.state || state || "").trim(),
          zipCode: zipCode || "",
          motorType: form.motorType,
          motorHp: form.horsepower,
          voltage: form.voltage,
          problemDescription: buildProblemDescription(form.failureDescription, form.canShip),
          urgencyLevel: isEmergency ? "emergency" : "low",
          industry: defaultIndustry ? String(defaultIndustry).trim() : "",
          listingId: mode === "shop" ? listingId : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className={`mx-auto max-w-[40rem] rounded-xl border border-success/40 bg-success/10 p-6 text-center sm:p-8 ${className}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-lg font-bold text-white">
          ✓
        </div>
        <h3 className="mt-4 text-lg font-bold text-title">Request submitted</h3>
        <p className="mt-2 text-sm text-secondary">
          {mode === "shop"
            ? `${shopName || "The shop"} will receive your request and follow up directly.`
            : locationLabel
              ? `We've matched your request to repair centers serving ${locationLabel}. You'll hear back within a few hours.`
              : "We've received your request and will match you with repair centers in your area."}
        </p>
        <p className="mt-3 text-xs italic text-secondary">
          For emergency repairs, call the shop directly using the phone number on their listing.
        </p>
      </div>
    );
  }

  const wrapClass = [
    "mx-auto max-w-[40rem] rounded-xl border bg-card p-5 shadow-sm sm:p-6",
    isEmergency ? "border-danger/40 bg-danger/5" : "border-border",
    className,
  ].join(" ");

  return (
    <div className={wrapClass}>
      <div className="mb-5">
        {isEmergency ? (
          <span className="mb-2 inline-flex items-center rounded-full bg-danger px-2.5 py-0.5 text-xs font-semibold text-white">
            Emergency
          </span>
        ) : null}
        <h3 className="text-lg font-bold text-title">
          {formHeading
            ? formHeading
            : lockUrgency
              ? "Submit emergency repair request"
              : mode === "shop"
                ? `Request a quote from ${shopName || "this shop"}`
                : city
                  ? `Submit a repair requirement in ${city}${state ? `, ${state}` : ""}`
                  : "Submit a repair requirement"}
        </h3>
        <p className="mt-1 text-sm text-secondary">
          {lockUrgency
            ? "Motor down? Describe the failure — we match you to 24/7 shops in your area within minutes."
            : mode === "shop"
              ? "Describe your motor and failure — the shop will respond directly."
              : "Describe your motor and failure — we'll match you with shops that serve this area."}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className={step === 1 ? "font-bold text-primary" : step > 1 ? "font-medium text-success" : "text-secondary"}>
          1 Motor details
        </span>
        <span className="text-secondary/50">›</span>
        <span className={step === 2 ? "font-bold text-primary" : "text-secondary"}>2 Your contact</span>
      </div>

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          {!lockUrgency ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant={form.urgency === "standard" ? "primary" : "outline"}
                size="sm"
                className="min-w-0 flex-1"
                onClick={() => setField("urgency", "standard")}
              >
                Standard repair
              </Button>
              <Button
                type="button"
                variant={form.urgency === "emergency" ? "danger" : "outline"}
                size="sm"
                className="min-w-0 flex-1"
                onClick={() => setField("urgency", "emergency")}
              >
                Emergency — motor is down
              </Button>
            </div>
          ) : null}

          <Select
            label="Motor type *"
            name="motorType"
            options={MOTOR_TYPE_OPTIONS}
            value={form.motorType}
            onChange={(e) => setField("motorType", e.target.value)}
            searchable={false}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Horsepower (HP)"
              name="horsepower"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 50"
              value={form.horsepower}
              onChange={(e) => setField("horsepower", e.target.value)}
            />
            <Input
              label="Voltage (V)"
              name="voltage"
              type="number"
              min="0"
              placeholder="e.g. 460"
              value={form.voltage}
              onChange={(e) => setField("voltage", e.target.value)}
            />
          </div>

          <Textarea
            label="Describe the failure or service needed *"
            name="failureDescription"
            rows={4}
            placeholder="e.g. Motor tripped the overload relay and won't restart. Burning smell noticed. Running a pump on a water treatment plant."
            value={form.failureDescription}
            onChange={(e) => setField("failureDescription", e.target.value)}
          />
          <p className="-mt-2 text-xs text-secondary">
            Include symptoms, application, and urgency constraints. Minimum 20 characters.
          </p>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-title">Can the motor be shipped / dropped off?</legend>
            <div className="flex flex-col gap-2">
              {Object.entries(CAN_SHIP_LABELS).map(([val, label]) => (
                <label key={val} className="flex cursor-pointer items-center gap-2 text-sm text-text">
                  <input
                    type="radio"
                    name="canShip"
                    value={val}
                    checked={form.canShip === val}
                    onChange={() => setField("canShip", val)}
                    className="text-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {showLocationFields ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="City"
                name="city"
                placeholder="e.g. Portland"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
              <Input
                label="State"
                name="state"
                placeholder="e.g. Oregon"
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
              />
            </div>
          ) : null}

          {mode !== "shop" && city ? (
            <p className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Shops will be matched to {city}
              {state ? `, ${state}` : ""}
            </p>
          ) : null}

          <Button type="button" variant="primary" size="lg" className="w-full" disabled={!step1Valid} onClick={() => setStep(2)}>
            Continue to contact details
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-text">
            <span>{form.motorType}</span>
            {form.horsepower ? <span> · {form.horsepower} HP</span> : null}
            {isEmergency ? <span className="font-semibold text-danger"> · Emergency</span> : null}
            <button type="button" className="ml-2 text-primary underline" onClick={() => setStep(1)}>
              Edit
            </button>
          </div>

          <Input
            label="Your name *"
            name="name"
            autoComplete="name"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />

          <Input
            label="Company / facility"
            name="company"
            autoComplete="organization"
            placeholder="Company name (optional)"
            value={form.company}
            onChange={(e) => setField("company", e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email *"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              required
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Best number to reach you"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              variant={isEmergency ? "danger" : "primary"}
              size="lg"
              className="w-full"
              disabled={!step2Valid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : isEmergency ? "Submit emergency request" : "Submit repair request"}
            </Button>
          </div>

          <p className="text-center text-xs text-secondary">
            Your contact details are shared only with the repair shop(s) matched to your request. We do not sell or share
            your data with third parties.
          </p>
        </div>
      )}
    </div>
  );
}
