"use client";

import { useMemo, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiLock } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { countryNameFromCode, countrySelectOptions } from "@/lib/countries";
import {
  IQMOTORTRACK_FREE_MOTOR_LIMIT,
  IQMOTORTRACK_MONTHLY_USD,
} from "@/lib/iqmotortrack-marketing";
import { useTrackAuth } from "./auth-context";

function AuthHero({ title, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-b-[1.75rem] bg-primary/10 px-6 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
        <FiLock className="h-6 w-6 shrink-0" aria-hidden />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-title">{title}</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-secondary">{subtitle}</p>
    </div>
  );
}

export default function TrackAuthScreens() {
  const [mode, setMode] = useState("login");
  return mode === "register" ? (
    <RegisterScreen onBack={() => setMode("login")} />
  ) : (
    <LoginScreen onCreate={() => setMode("register")} />
  );
}

function LoginScreen({ onCreate }) {
  const { login } = useTrackAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col bg-bg">
      <AuthHero
        title="IQMotorTrack"
        subtitle={`Motor maintenance and repair for plants. Free for ${IQMOTORTRACK_FREE_MOTOR_LIMIT} motors. Pro $${IQMOTORTRACK_MONTHLY_USD}/mo.`}
      />
      <div className="flex-1 px-4 py-5">
        <Form id="track-login-form" onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-bold text-title">Sign in</h2>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@plant.com"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" form="track-login-form" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
            {!busy ? <FiArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
          </Button>
          <button type="button" onClick={onCreate} className="w-full text-center text-sm text-secondary">
            New here? <span className="font-semibold text-primary">Create Account</span>
          </button>
        </Form>
      </div>
    </div>
  );
}

function RegisterScreen({ onBack }) {
  const { register } = useTrackAuth();
  const [facilityName, setFacilityName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const countryOptions = useMemo(() => countrySelectOptions(), []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!facilityName.trim()) {
      setError("Please enter your facility or plant name.");
      return;
    }
    if (!contactName.trim()) {
      setError("Please enter a contact name.");
      return;
    }
    if (!country) {
      setError("Please select your country.");
      return;
    }
    setBusy(true);
    try {
      await register({
        facilityName: facilityName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        country: countryNameFromCode(country) || country,
        countryCode: country,
      });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col bg-bg">
      <AuthHero
        title="Create facility"
        subtitle={`Free for up to ${IQMOTORTRACK_FREE_MOTOR_LIMIT} motors. Upgrade to Pro when you need more.`}
      />
      <div className="flex-1 px-4 py-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to sign in
        </button>
        <Form id="track-register-form" onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Facility / plant name"
            name="facilityName"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            required
          />
          <Input
            label="Your name"
            name="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Select
            label="Country"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={countryOptions}
            placeholder="Select country"
            required
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" form="track-register-form" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create account"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
