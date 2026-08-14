import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { appFetch, isAuthRejected } from "./api";

const TOKEN_KEY = "motop_calcs_jwt";
const ACCOUNT_KEY = "motop_calcs_account";

const MobileAuthContext = createContext(null);

export function MobileAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const readyRef = useRef(false);

  const persist = useCallback(async (tok, acc) => {
    if (tok) await SecureStore.setItemAsync(TOKEN_KEY, tok);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
    if (acc) await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(acc));
    else await SecureStore.deleteItemAsync(ACCOUNT_KEY);
    setToken(tok);
    setAccount(acc);
  }, []);

  const applyAuthResponse = useCallback(
    async (data) => {
      const tok = data.token;
      const acc = data.account || null;
      if (!tok) throw new Error("No token returned");
      await persist(tok, acc);
    },
    [persist]
  );

  const verifyAccess = useCallback(async () => {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!t) {
      await persist(null, null);
      return null;
    }
    try {
      const data = await appFetch("/api/mobile-app/auth/me", { token: t });
      const acc = data.account || null;
      await persist(t, acc);
      return acc;
    } catch (e) {
      if (isAuthRejected(e)) {
        await persist(null, null);
        return null;
      }
      return null;
    }
  }, [persist]);

  const refreshAccount = useCallback(async () => verifyAccess(), [verifyAccess]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await SecureStore.getItemAsync(TOKEN_KEY);
        const aJson = await SecureStore.getItemAsync(ACCOUNT_KEY);
        if (cancelled) return;
        if (t) setToken(t);
        if (aJson) {
          try {
            setAccount(JSON.parse(aJson));
          } catch {
            setAccount(null);
          }
        }
        if (t) {
          await verifyAccess();
        }
      } finally {
        if (!cancelled) {
          readyRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Restore once on launch; later checks use AppState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && readyRef.current) {
        verifyAccess().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [verifyAccess]);

  const login = useCallback(
    async (email, password) => {
      const data = await appFetch("/api/mobile-app/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const register = useCallback(
    async ({ name, phone, email, password, country }) => {
      const data = await appFetch("/api/mobile-app/auth/register", {
        method: "POST",
        body: { name, phone, email, password, country },
      });
      await applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const logout = useCallback(async () => {
    await persist(null, null);
  }, [persist]);

  const updateProfile = useCallback(
    async ({ name, phone }) => {
      const data = await appFetch("/api/mobile-app/profile", {
        token,
        method: "PATCH",
        body: { name, phone },
      });
      if (data.account) {
        setAccount(data.account);
        await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(data.account));
      }
      return data.account;
    },
    [token]
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

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth() {
  const ctx = useContext(MobileAuthContext);
  if (!ctx) throw new Error("useMobileAuth must be used within MobileAuthProvider");
  return ctx;
}
