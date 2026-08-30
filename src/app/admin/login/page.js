"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiShield, FiList, FiUsers, FiBarChart2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Checkbox from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form-layout";
import HeroBackground from "@/components/marketing/HeroBackground";
import { BRAND_LOGO_HEIGHT, BRAND_LOGO_PUBLIC_PATH, BRAND_LOGO_WIDTH } from "@/lib/brand-logo";

const REMEMBER_ADMIN_LOGIN_KEY = "iqmotorbase.rememberAdminLogin";

function readRememberedLogin() {
  if (typeof window === "undefined") return { rememberMe: false, email: "", password: "" };
  try {
    const raw = window.localStorage.getItem(REMEMBER_ADMIN_LOGIN_KEY);
    if (!raw) return { rememberMe: false, email: "", password: "" };
    const parsed = JSON.parse(raw);
    return {
      rememberMe: true,
      email: String(parsed?.email || ""),
      password: String(parsed?.password || ""),
    };
  } catch {
    return { rememberMe: false, email: "", password: "" };
  }
}

function saveRememberedLogin(email, password) {
  try {
    window.localStorage.setItem(
      REMEMBER_ADMIN_LOGIN_KEY,
      JSON.stringify({
        email: String(email || "").trim(),
        password: String(password || ""),
      })
    );
  } catch {
    // ignore quota / private mode
  }
}

function clearRememberedLogin() {
  try {
    window.localStorage.removeItem(REMEMBER_ADMIN_LOGIN_KEY);
  } catch {
    // ignore
  }
}

function AdminLoginShell({ title, subtitle, children }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90" aria-label="IQ Motorbase — home">
            <Image
              src={BRAND_LOGO_PUBLIC_PATH}
              alt="IQ Motorbase"
              width={BRAND_LOGO_WIDTH}
              height={BRAND_LOGO_HEIGHT}
              className="h-10 w-auto max-w-[min(100%,240px)] object-contain object-left sm:h-12 sm:max-w-[min(100%,280px)] md:h-14 md:max-w-[320px]"
              priority
            />
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-title sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-2xl text-sm text-secondary sm:text-base">{subtitle}</p> : null}
        </div>
      </section>

      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary">
                <FiShield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Restricted admin access
              </div>
              <p className="text-base text-secondary">
                Sign in to manage directory listings, registered shops, marketing outreach, and platform settings.
              </p>
              <ul className="mt-6 space-y-4 text-sm text-secondary">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                    <FiList className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="font-medium text-title">Listings &amp; onboarding</span>
                    <br />
                    Review submissions, approve shops, and create featured listings.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                    <FiUsers className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="font-medium text-title">Clients &amp; subscriptions</span>
                    <br />
                    Manage registered portals, access, and plan changes.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                    <FiBarChart2 className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="font-medium text-title">Stats &amp; operations</span>
                    <br />
                    Track listing performance, jobs, and marketplace activity.
                  </span>
                </li>
              </ul>
              <p className="mt-8 text-sm text-secondary">
                Looking for the shop portal instead?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Log in here
                </Link>
                .
              </p>
            </div>

            <div>{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const remembered = readRememberedLogin();
    if (remembered.rememberMe && (remembered.email || remembered.password)) {
      setRememberMe(true);
      setEmail(remembered.email);
      setPassword(remembered.password);
    }
  }, []);

  function persistRememberChoice() {
    if (rememberMe) saveRememberedLogin(email, password);
    else clearRememberedLogin();
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.requiresTotp) {
        setStep("totp");
        return;
      }
      persistRememberChoice();
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      persistRememberChoice();
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "totp") {
    return (
      <AdminLoginShell
        title="Two-factor authentication"
        subtitle="Enter the 6-digit code from your authenticator app to finish signing in."
      >
        <Form onSubmit={handleTotpSubmit} className="bg-card/80 shadow-sm backdrop-blur sm:p-8">
          <div>
            <p className="text-sm font-semibold text-title">Authentication code</p>
            <p className="mt-1 text-sm text-secondary">Open your authenticator app and enter the current code.</p>
          </div>
          <Input
            label="6-digit code"
            name="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            required
          />
          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3">
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? "Verifying…" : "Verify and continue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={() => {
                setStep("password");
                setTotpCode("");
                setError("");
              }}
            >
              Back to sign in
            </Button>
          </div>
        </Form>
      </AdminLoginShell>
    );
  }

  return (
    <AdminLoginShell
      title="Admin sign in"
      subtitle="Secure access for IQMotorBase operations — listings, clients, and platform tools."
    >
      <Form onSubmit={handlePasswordSubmit} className="bg-card/80 shadow-sm backdrop-blur sm:p-8">
        <div>
          <p className="text-sm font-semibold text-title">Sign in to admin</p>
          <p className="mt-1 text-sm text-secondary">Use your admin email and password.</p>
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Checkbox
          name="rememberMe"
          className="mt-4"
          label="Remember me on this device"
          help="Saves your email and password on this device and keeps you signed in longer."
          checked={rememberMe}
          onChange={(e) => {
            const on = e.target.checked;
            setRememberMe(on);
            if (!on) clearRememberedLogin();
          }}
        />
        {error ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </Form>
    </AdminLoginShell>
  );
}
