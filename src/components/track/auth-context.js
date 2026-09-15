"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { appFetch, isAuthRejected } from "./api";

const TOKEN_KEY = "iqmotortrack_token";
const SESSION_KEY = "iqmotortrack_session";

const TrackAuthContext = createContext(null);

function readStored() {
  if (typeof window === "undefined") return { token: null, session: null };
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const raw = window.localStorage.getItem(SESSION_KEY);
    return { token: token || null, session: raw ? JSON.parse(raw) : null };
  } catch {
    return { token: null, session: null };
  }
}

function writeStored(token, session) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function TrackAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((tok, sess) => {
    writeStored(tok, sess);
    setToken(tok);
    setSession(sess);
  }, []);

  const refreshSession = useCallback(async () => {
    const current = token || readStored().token;
    if (!current) {
      persist(null, null);
      return null;
    }
    try {
      const data = await appFetch("/api/track/auth/me", { token: current });
      const sess = data.session || null;
      persist(current, sess);
      return sess;
    } catch (e) {
      if (isAuthRejected(e)) persist(null, null);
      return null;
    }
  }, [persist, token]);

  useEffect(() => {
    const stored = readStored();
    if (stored.token) setToken(stored.token);
    if (stored.session) setSession(stored.session);
    (async () => {
      try {
        if (stored.token) {
          const data = await appFetch("/api/track/auth/me", { token: stored.token });
          persist(stored.token, data.session || null);
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
      if (document.visibilityState === "visible" && token) refreshSession().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshSession, token]);

  const login = useCallback(
    async (email, password) => {
      const data = await appFetch("/api/track/auth/login", {
        method: "POST",
        body: { email, password },
      });
      persist(data.token, data.session || null);
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const data = await appFetch("/api/track/auth/register", {
        method: "POST",
        body: payload,
      });
      persist(data.token, data.session || null);
    },
    [persist]
  );

  const logout = useCallback(() => persist(null, null), [persist]);

  const value = useMemo(
    () => ({
      token,
      session,
      loading,
      login,
      register,
      logout,
      refreshSession,
      isLoggedIn: Boolean(token),
      isPro: Boolean(session?.isPro),
    }),
    [token, session, loading, login, register, logout, refreshSession]
  );

  return <TrackAuthContext.Provider value={value}>{children}</TrackAuthContext.Provider>;
}

export function useTrackAuth() {
  const ctx = useContext(TrackAuthContext);
  if (!ctx) throw new Error("useTrackAuth must be used within TrackAuthProvider");
  return ctx;
}
