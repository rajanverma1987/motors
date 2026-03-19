import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { techFetch } from "./api";
import { registerExpoPushForTechnician } from "./pushNotifications";

const TOKEN_KEY = "motop_tech_jwt";
const EMPLOYEE_KEY = "motop_tech_employee";
const STATUSES_KEY = "motop_tech_statuses";

const TechAuthContext = createContext(null);

export function TechAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [workOrderStatuses, setWorkOrderStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const t = await SecureStore.getItemAsync(TOKEN_KEY);
      const eJson = await SecureStore.getItemAsync(EMPLOYEE_KEY);
      const sJson = await SecureStore.getItemAsync(STATUSES_KEY);
      if (t) setToken(t);
      if (eJson) {
        try {
          setEmployee(JSON.parse(eJson));
        } catch {
          setEmployee(null);
        }
      }
      if (sJson) {
        try {
          const arr = JSON.parse(sJson);
          setWorkOrderStatuses(Array.isArray(arr) ? arr : []);
        } catch {
          setWorkOrderStatuses([]);
        }
      }
    } catch {
      setToken(null);
      setEmployee(null);
      setWorkOrderStatuses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loading || !token) return;
    registerExpoPushForTechnician(token).catch(() => {});
  }, [loading, token]);

  const login = useCallback(async (email, password) => {
    const data = await techFetch("/api/tech/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const tok = data.token;
    const emp = data.employee || null;
    const st = Array.isArray(data.workOrderStatuses) ? data.workOrderStatuses : [];
    if (!tok) throw new Error("No token returned");
    await SecureStore.setItemAsync(TOKEN_KEY, tok);
    if (emp) await SecureStore.setItemAsync(EMPLOYEE_KEY, JSON.stringify(emp));
    await SecureStore.setItemAsync(STATUSES_KEY, JSON.stringify(st));
    setToken(tok);
    setEmployee(emp);
    setWorkOrderStatuses(st);
    registerExpoPushForTechnician(tok).catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(EMPLOYEE_KEY);
    await SecureStore.deleteItemAsync(STATUSES_KEY);
    setToken(null);
    setEmployee(null);
    setWorkOrderStatuses([]);
  }, []);

  const value = useMemo(
    () => ({
      token,
      employee,
      workOrderStatuses,
      loading,
      login,
      logout,
      isLoggedIn: Boolean(token),
    }),
    [token, employee, workOrderStatuses, loading, login, logout]
  );

  return <TechAuthContext.Provider value={value}>{children}</TechAuthContext.Provider>;
}

export function useTechAuth() {
  const ctx = useContext(TechAuthContext);
  if (!ctx) {
    throw new Error("useTechAuth must be used within TechAuthProvider");
  }
  return ctx;
}
