"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { Form } from "@/components/ui/form-layout";
import HeroBackground from "@/components/marketing/HeroBackground";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, mounted } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (user) router.replace("/dashboard");
  }, [mounted, user, router]);

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
        router.push("/dashboard");
        return;
      }
      setError(result.error || "Login failed.");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Log in to your portal
          </h1>
        </div>
      </section>

      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-base text-secondary">
                Sign in to see your center board, open work orders, and any new repair leads from MotorsWinding.com.
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
                  register your center here
                </Link>
                .
              </p>
            </div>

            <div>
              <Form
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
                  />
                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="Your password"
                    value={form.password}
                    onChange={handleChange}
                    required
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
                    Don&apos;t have an account?{" "}
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
