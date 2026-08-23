"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const AUTH_ME_TIMEOUT_MS = 5000;

function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_ME_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId =
    typeof window !== "undefined"
      ? window.setTimeout(() => {
          try {
            controller?.abort();
          } catch {
            // ignore
          }
        }, timeoutMs)
      : null;

  const started = fetch(url, {
    ...options,
    signal: controller?.signal ?? options.signal,
  });

/* Hard ceiling: some mobile browsers never settle abort on hung LAN requests. */
  const raced = Promise.race([
    started,
    new Promise((_, reject) => {
      if (typeof window === "undefined") return;
      window.setTimeout(() => reject(new Error("auth_timeout")), timeoutMs + 250);
    }),
  ]);

  return raced.finally(() => {
    if (timeoutId != null) window.clearTimeout(timeoutId);
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetchWithTimeout("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          ...data.user,
          listingOnlyAccount: !!data.user?.listingOnlyAccount,
          trialAccount: !!data.user?.trialAccount,
          calculatorOnlyAccount: !!data.user?.calculatorOnlyAccount,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setMounted(true);
    }, AUTH_ME_TIMEOUT_MS + 500);

    loadUser().finally(() => {
      if (!cancelled) {
        window.clearTimeout(failSafe);
        setMounted(true);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
    };
  }, [loadUser]);

  const login = useCallback(async (email, password, options = {}) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        rememberMe: !!options.rememberMe,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Login failed." };
    }
    setUser({
      ...data.user,
      listingOnlyAccount: !!data.user?.listingOnlyAccount,
      trialAccount: !!data.user?.trialAccount,
      calculatorOnlyAccount: !!data.user?.calculatorOnlyAccount,
    });
    return { ok: true, user: data.user };
  }, []);

  const register = useCallback(async (shopName, contactName, email, password, options = {}) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        shopName,
        contactName,
        email,
        password,
        calculatorOnly: !!options.calculatorOnly,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Registration failed." };
    }
    setUser({
      ...data.user,
      listingOnlyAccount: !!data.user?.listingOnlyAccount,
      trialAccount: !!data.user?.trialAccount,
      calculatorOnlyAccount: !!data.user?.calculatorOnlyAccount,
    });
    return { ok: true, user: data.user };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      // ignore
    }
    setUser(null);
  }, []);

  const value = { user, login, register, logout, mounted };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
