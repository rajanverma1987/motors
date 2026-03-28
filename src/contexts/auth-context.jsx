"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser({
          ...data.user,
          listingOnlyAccount: !!data.user?.listingOnlyAccount,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser().then(() => setMounted(true));
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Login failed." };
    }
    setUser({
      ...data.user,
      listingOnlyAccount: !!data.user?.listingOnlyAccount,
    });
    return { ok: true };
  }, []);

  const register = useCallback(async (shopName, contactName, email, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ shopName, contactName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Registration failed." };
    }
    setUser({
      ...data.user,
      listingOnlyAccount: !!data.user?.listingOnlyAccount,
    });
    return { ok: true };
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
