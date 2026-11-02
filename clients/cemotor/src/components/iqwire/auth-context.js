"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { appFetch, isAuthRejected } from "./api";

const TOKEN_KEY = "iqwirecalculator_token";
const ACCOUNT_KEY = "iqwirecalculator_account";

const IqwireAuthContext = createContext(null);

function readStored() {
  if (typeof window === "undefined") return { token: null, account: null };
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    return { token: token || null, account: raw ? JSON.parse(raw) : null };
  } catch {
    return { token: null, account: null };
  }
}

function writeStored(token, account) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    if (account) window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    else window.localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* ignore quota */
  }
}

export function IqwireAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((tok, acc) => {
    writeStored(tok, acc);
    setToken(tok);
    setAccount(acc);
  }, []);

  const refreshAccount = useCallback(async () => {
    const current = token || readStored().token;
    if (!current) {
      persist(null, null);
      return null;
    }
    try {
      const data = await appFetch("/api/mobile-app/auth/me", { token: current });
      const acc = data.account || null;
      persist(current, acc);
      return acc;
    } catch (e) {
      if (isAuthRejected(e)) persist(null, null);
      return null;
    }
  }, [persist, token]);

  useEffect(() => {
    const stored = readStored();
    if (stored.token) setToken(stored.token);
    if (stored.account) setAccount(stored.account);
    (async () => {
      try {
        if (stored.token) {
          const data = await appFetch("/api/mobile-app/auth/me", { token: stored.token });
          persist(stored.token, data.account || null);
        }
      } catch (e) {
        if (isAuthRejected(e)) persist(null, null);
      } finally {
        setLoading(false);
      }
    })();
  }, [persist]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && token) refreshAccount().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshAccount, token]);

  const login = useCallback(
    async (email, password) => {
      const data = await appFetch("/api/mobile-app/auth/login", {
        method: "POST",
        body: { email, password },
      });
      persist(data.token, data.account || null);
    },
    [persist]
  );

  const register = useCallback(
    async ({ name, companyName, phone, email, password, country, countryName }) => {
      const data = await appFetch("/api/mobile-app/auth/register", {
        method: "POST",
        body: { name, companyName, phone, email, password, country, countryName },
      });
      persist(data.token, data.account || null);
    },
    [persist]
  );

  const logout = useCallback(() => persist(null, null), [persist]);

  const updateProfile = useCallback(
    async ({ name, companyName, phone }) => {
      const data = await appFetch("/api/mobile-app/profile", {
        token,
        method: "PATCH",
        body: { name, companyName, phone },
      });
      if (data.account) persist(token, data.account);
      return data.account;
    },
    [persist, token]
  );

  const value = useMemo(
    () => ({
      token,
      account,
      loading,
      login,
      register,
      logout,
      refreshAccount,
      updateProfile,
      isLoggedIn: Boolean(token),
      unlocked: account?.unlocked !== false,
    }),
    [token, account, loading, login, register, logout, refreshAccount, updateProfile]
  );

  return <IqwireAuthContext.Provider value={value}>{children}</IqwireAuthContext.Provider>;
}

export function useIqwireAuth() {
  const ctx = useContext(IqwireAuthContext);
  if (!ctx) throw new Error("useIqwireAuth must be used within IqwireAuthProvider");
  return ctx;
}
