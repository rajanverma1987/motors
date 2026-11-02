"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Checkbox from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { Form } from "@/components/ui/form-layout";
import BrandLogo from "@/components/marketing/brand-logo";
import { portalLandingPath } from "@/lib/portal-view";

const REMEMBER_LOGIN_KEY = "iqmotorbase.rememberLogin";

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

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-[#1f1c1a]">
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandLogo
              priority
              plain
              className="h-10 w-auto max-w-[min(100%,14rem)] object-contain sm:h-12"
              wrapperClassName="justify-center"
            />
            <p className="mt-4 text-sm font-medium tracking-wide text-neutral-500">3PhaseFlow</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Shop portal sign in
            </h1>
            <p className="mt-2 max-w-sm text-sm text-neutral-600">
              Sign in to manage work orders, customers, quotes, and leads for your motor repair shop.
            </p>
          </div>

          {redirecting ? (
            <p className="mb-3 text-center text-sm text-neutral-600" role="status">
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
            className="border border-neutral-200 bg-white shadow-sm sm:p-8"
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
            <div className="mt-6">
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Log in"}
              </Button>
            </div>
          </Form>
        </div>
      </main>

      <footer className="relative z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-neutral-500">
        Powered by{" "}
        <span className="font-medium text-neutral-800">3PhaseFlow</span>
      </footer>
    </div>
  );
}
