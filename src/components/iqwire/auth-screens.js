"use client";

import { useMemo, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiLock, FiUser } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { countryNameFromCode, countrySelectOptions } from "@/lib/countries";
import { useIqwireAuth } from "./auth-context";

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

export default function AuthScreens() {
  const [mode, setMode] = useState("login");
  return mode === "register" ? (
    <RegisterScreen onBack={() => setMode("login")} />
  ) : (
    <LoginScreen onCreate={() => setMode("register")} />
  );
}

function LoginScreen({ onCreate }) {
  const { login } = useIqwireAuth();
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
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <AuthHero
        title="IQWireCalculator"
        subtitle="3-day free trial, then $11.99/month or $119/year. Cancel anytime."
      />
      <div className="flex-1 px-4 py-5">
        <Form id="iqwire-login-form" onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-bold text-title">Sign in</h2>
          <p className="text-sm text-secondary">Use the email you registered in this app. This is not a shop login.</p>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
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
          <Button type="submit" form="iqwire-login-form" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
            {!busy ? <FiArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
          </Button>
          <button type="button" onClick={onCreate} className="w-full text-center text-sm text-secondary">
            New here? <span className="font-semibold text-primary">Create an account</span>
          </button>
        </Form>
      </div>
    </div>
  );
}

function RegisterScreen({ onBack }) {
  const { register } = useIqwireAuth();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
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
    if (!country) {
      setError("Please select your country.");
      return;
    }
    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    setBusy(true);
    try {
      await register({
        name: name.trim(),
        companyName: companyName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        country,
        countryName: countryNameFromCode(country),
      });
    } catch (err) {
      setError(err.message || "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <div className="rounded-b-[1.75rem] bg-primary/10 px-6 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Sign in
        </button>
        <h1 className="text-2xl font-extrabold text-title">Join IQWireCalculator</h1>
        <p className="mt-1 text-sm text-secondary">3-day free trial. Not tied to a shop login.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <Form id="iqwire-register-form" onSubmit={onSubmit} className="space-y-4">
          <Input label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          <Input
            label="Company name"
            name="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoComplete="organization"
          />
          <Input label="Phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <Select
            label="Country"
            name="country"
            options={countryOptions}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Select country"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            help="At least 10 characters, with a letter and a number."
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" form="iqwire-register-form" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Start free trial"}
            {!busy ? <FiUser className="h-4 w-4 shrink-0" aria-hidden /> : null}
          </Button>
        </Form>
      </div>
    </div>
  );
}
