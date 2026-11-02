"use client";

import { createContext, useContext, useCallback } from "react";

const AuthContext = createContext(null);

/**
 * Marketing site has no shop portal login. Keep a stub so older marketing
 * calculator components that call useAuth() still mount safely.
 */
export function AuthProvider({ children }) {
  const login = useCallback(async () => {
    return { ok: false, error: "Shop login is not available on this site. Contact us for access." };
  }, []);

  const register = useCallback(async () => {
    return { ok: false, error: "Self-serve signup is not available. Contact us to get a shop." };
  }, []);

  const logout = useCallback(async () => {}, []);

  return (
    <AuthContext.Provider
      value={{
        user: null,
        mounted: true,
        login,
        register,
        logout,
        refreshUser: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
