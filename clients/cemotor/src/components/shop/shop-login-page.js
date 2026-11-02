"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Checkbox from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { Form } from "@/components/ui/form-layout";
import BrandLogo from "@/components/marketing/brand-logo";
import { portalLandingPath } from "@/lib/portal-view";

const REMEMBER_LOGIN_KEY = "iqmotorbase.rememberLogin";
const SUPPORT_EMAIL = "contact@3phaseflow.com";
const MARKETING_URL = "https://3phaseflow.com";

function readRememberedLogin() {
  if (typeof window === "undefined") return { rememberMe: false, email: "", password: "" };
  try {
    const raw = window.localStorage.getItem(REMEMBER_LOGIN_KEY);
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
      REMEMBER_LOGIN_KEY,
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
    window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
  } catch {
    // ignore
  }
}

/** Open redirect safe: same-origin path only. */
function safeNextPath(raw) {
  if (raw == null || typeof raw !== "string") return "";
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return "";
  }
  s = s.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return "";
  if (s.includes("\\") || s.includes("\n") || s.includes("\r")) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(s)) return "";
  return s;
}

function destForUser(nextUser, nextPath) {
  if (nextPath) return nextPath;
  return portalLandingPath({
    calculatorOnlyAccount: nextUser?.calculatorOnlyAccount,
    portalUi: nextUser?.portalUi,
  });
}

function readQueryParam(name) {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

export default function ShopLoginPage() {
  const router = useRouter();
  const [nextRaw, setNextRaw] = useState("");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);
  const { login, user, mounted } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setNextRaw(readQueryParam("next"));
    const remembered = readRememberedLogin();
    if (remembered.rememberMe && (remembered.email || remembered.password)) {
      setRememberMe(true);
      setForm({ email: remembered.email, password: remembered.password });
    }
  }, []);

  useEffect(() => {
    if (!mounted || !user || redirecting) return;
    setRedirecting(true);
    const dest = destForUser(user, nextPath);
    const t = window.setTimeout(() => {
      setRedirecting(false);
    }, 4000);
    router.replace(dest);
    return () => window.clearTimeout(t);
  }, [mounted, user, redirecting, router, nextPath]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(form.email, form.password, { rememberMe });
      if (result.ok) {
        if (rememberMe) saveRememberedLogin(form.email, form.password);
        else clearRememberedLogin();
        router.push(destForUser(result.user, nextPath));
        return;
      }
      setError(result.error || "Login failed.");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Shop portal help")}`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      {/* Brand panel: charcoal metal logo on a warm light plate (no invert) */}
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
            Shop portal
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            Your motor repair shop, in one place.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[#cfc9c3] sm:text-[1.05rem]">
            Sign in to run work orders, customers, quotes, and the floor from this private
            3PhaseFlow host.
          </p>
          <ul className="mt-8 space-y-3.5 text-[0.95rem] text-[#d9d3cd]">
            <li className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c47a36]" aria-hidden />
              Jobs, proposals, and purchase orders
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c47a36]" aria-hidden />
              Customers, motors, and team time clock
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c47a36]" aria-hidden />
              Isolated shop data for your business only
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

      {/* Form panel */}
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

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7348]">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1f1c1a]">
              Sign in
            </h2>
            <p className="mt-2 text-[0.95rem] text-neutral-500">
              Use your shop email and password to open the portal.
            </p>

            {redirecting ? (
              <p className="mt-6 text-sm text-neutral-600" role="status">
                Signed in, opening your portal…
              </p>
            ) : null}

            <Form
              method="post"
              action="#"
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="!mt-9 !border-0 !bg-transparent !p-0 !shadow-none sm:!p-0"
            >
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
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
              <div className="mt-5 flex items-start justify-between gap-3">
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
                <Link
                  href="/forgot-password"
                  className="shrink-0 pt-0.5 text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
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
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Continue"}
              </Button>
            </Form>

            <div className="mt-10 space-y-4 border-t border-neutral-200/80 pt-8">
              <p className="text-sm text-neutral-600">
                Need help getting in?
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-[#1f1c1a] hover:text-primary"
                >
                  Reset your password by email
                </Link>
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
