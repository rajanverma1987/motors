"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Checkbox from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form-layout";
import BrandLogo from "@/components/marketing/brand-logo";

const REMEMBER_ADMIN_LOGIN_KEY = "iqmotorbase.rememberAdminLogin";
const SUPPORT_EMAIL = "contact@3phaseflow.com";
const MARKETING_URL = "https://3phaseflow.com";

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

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Admin portal help")}`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-[#1f1c1a] px-8 py-10 text-[#f3f1ef] sm:px-12 sm:py-12 lg:min-h-screen lg:px-14 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 18% 12%, rgba(196,122,54,0.32), transparent 55%), radial-gradient(ellipse 55% 45% at 92% 88%, rgba(196,122,54,0.14), transparent 50%)",
          }}
          aria-hidden
        />

        <div className="relative z-10">
          <div className="inline-flex rounded-lg bg-[linear-gradient(180deg,#f7f3ee_0%,#ebe4db_100%)] px-3 py-2.5 shadow-[0_0_0_1px_rgba(196,122,54,0.25),0_10px_28px_-8px_rgba(0,0,0,0.45)]">
            <BrandLogo
              priority
              plain
              className="h-9 w-auto max-w-[12.5rem] object-contain object-left sm:h-10 sm:max-w-[14rem]"
            />
          </div>
        </div>

        <div className="relative z-10 mt-14 max-w-md lg:mt-0 lg:pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c47a36]">
            Admin portal
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            Run the 3PhaseFlow platform.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[#cfc9c3] sm:text-[1.05rem]">
            Sign in to manage tenants, listings, leads, support, and shop operations from one
            restricted console.
          </p>
          <ul className="mt-8 space-y-3.5 text-[0.95rem] text-[#d9d3cd]">
            <li className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c47a36]" aria-hidden />
              Tenants, Open shop, and password resets
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c47a36]" aria-hidden />
              Listings, leads, and client subscriptions
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c47a36]" aria-hidden />
              Support tickets and platform tools
            </li>
          </ul>
        </div>

        <div className="relative z-10 mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-sm text-[#a89f96] lg:mt-0">
          <a href={supportMailto} className="hover:text-[#c47a36]">
            Support
          </a>
          <a
            href={MARKETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#c47a36]"
          >
            3PhaseFlow.com
          </a>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <a href={supportMailto} className="hover:text-[#c47a36]">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </aside>

      <section className="relative flex flex-col bg-[#fbfaf8] text-[#1f1c1a]">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(196,122,54,0.07), transparent 55%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-[26rem]">
            <div className="mb-10 lg:hidden">
              <BrandLogo
                priority
                plain
                className="h-9 w-auto max-w-[12rem] object-contain"
              />
            </div>

            {step === "totp" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7348]">
                  Two-factor
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1f1c1a]">
                  Enter your code
                </h2>
                <p className="mt-2 text-[0.95rem] text-neutral-500">
                  Open your authenticator app and enter the 6-digit code.
                </p>

                <Form
                  onSubmit={handleTotpSubmit}
                  className="!mt-9 !border-0 !bg-transparent !p-0 !shadow-none sm:!p-0"
                >
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
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="mt-8 w-full"
                    disabled={loading}
                  >
                    {loading ? "Verifying…" : "Verify and continue"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={loading}
                    onClick={() => {
                      setStep("password");
                      setTotpCode("");
                      setError("");
                    }}
                  >
                    Back to sign in
                  </Button>
                </Form>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7348]">
                  Restricted access
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1f1c1a]">
                  Sign in
                </h2>
                <p className="mt-2 text-[0.95rem] text-neutral-500">
                  Use your admin email and password.
                </p>

                <Form
                  onSubmit={handlePasswordSubmit}
                  className="!mt-9 !border-0 !bg-transparent !p-0 !shadow-none sm:!p-0"
                >
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="mt-5"
                    suffix={
                      <button
                        type="button"
                        className="px-2 text-xs font-medium text-primary hover:underline"
                        onClick={() => setShowPassword((on) => !on)}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? "Hide password" : "View password"}
                      >
                        {showPassword ? "Hide" : "View"}
                      </button>
                    }
                  />
                  <div className="mt-5">
                    <Checkbox
                      name="rememberMe"
                      label="Remember me"
                      checked={rememberMe}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setRememberMe(on);
                        if (!on) clearRememberedLogin();
                      }}
                    />
                  </div>
                  {error ? (
                    <p className="mt-4 text-sm text-danger" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="mt-8 w-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in…" : "Continue"}
                  </Button>
                </Form>

                <div className="mt-10 space-y-4 border-t border-neutral-200/80 pt-8">
                  <p className="text-sm text-neutral-600">Need help getting in?</p>
                  <div className="flex flex-col gap-2.5 text-sm">
                    <a href={supportMailto} className="font-medium text-[#1f1c1a] hover:text-primary">
                      Email support · {SUPPORT_EMAIL}
                    </a>
                    <a
                      href={MARKETING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-neutral-500 hover:text-primary"
                    >
                      About 3PhaseFlow
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="relative z-10 px-6 py-5 text-center text-xs text-neutral-400 sm:px-10 lg:px-14 lg:text-left xl:px-20">
          Powered by{" "}
          <a
            href={MARKETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-neutral-600 hover:text-primary"
          >
            3PhaseFlow
          </a>
        </footer>
      </section>
    </div>
  );
}
