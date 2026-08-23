"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { Form } from "@/components/ui/form-layout";
import HeroBackground from "@/components/marketing/HeroBackground";
import { portalLandingPath } from "@/lib/portal-view";

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

export default function LoginPage() {
  const router = useRouter();
  const [nextRaw, setNextRaw] = useState("");
  const [intent, setIntent] = useState("");
  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);
  const { login, user, mounted } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setNextRaw(readQueryParam("next"));
    setIntent(readQueryParam("intent"));
  }, []);

  // Never block the form on session check — tablet/LAN auth can hang.
  // Redirect only after we know there is a session.
  useEffect(() => {
    if (!mounted || !user || redirecting) return;
    setRedirecting(true);
    const dest = destForUser(user, nextPath);
    const t = window.setTimeout(() => {
      // If navigation stalls, user can still use the form.
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
      const result = await login(form.email, form.password);
      if (result.ok) {
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
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Log in to your portal
          </h1>
        </div>
      </section>

      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            <div>
              {intent === "calculators" ? (
                <div className="mb-6 rounded-xl border border-primary/35 bg-primary/[0.08] px-4 py-3 text-sm text-secondary">
                  <p className="font-semibold text-title">Already listed on our portal?</p>
                  <p className="mt-1">
                    Log in with your shop email and password, then you can complete calculator payment. Forgot your
                    password?{" "}
                    <Link href="/contact" className="font-medium text-primary hover:underline">
                      Contact us
                    </Link>{" "}
                    and we&apos;ll help you reset it.
                  </p>
                </div>
              ) : null}
              <p className="text-base text-secondary">
                Sign in to see your center board, open work orders, and any new repair leads from IQMotorBase.com.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-secondary">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>
                    View{" "}
                    <span className="font-medium text-title">jobs by status</span> and keep floor and office in sync
                    without chasing paper.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>
                    Access{" "}
                    <span className="font-medium text-title">customers, motors, and quotes</span> in one system when a
                    call comes in.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>
                    See{" "}
                    <span className="font-medium text-title">new repair leads</span> and convert them into work orders
                    without re-entering data.
                  </span>
                </li>
              </ul>
              <p className="mt-6 text-sm text-secondary">
                If you don&apos;t have an account yet, you can{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Register your shop here
                </Link>
                .
              </p>
            </div>

            <div>
              {redirecting ? (
                <p className="mb-3 text-sm text-secondary" role="status">
                  Signed in — opening your portal…
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
                className="bg-card/80 shadow-sm backdrop-blur sm:p-8"
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
                  type="password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                {error && (
                  <p className="mt-4 text-sm text-danger" role="alert">
                    {error}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3">
                  <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? "Signing in…" : "Log in"}
                  </Button>
                  <p className="text-center text-sm text-secondary">
                    DoRegister your shopount?{" "}
                    <Link href="/register" className="font-medium text-primary hover:underline">
                      Register your center
                    </Link>
                  </p>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
