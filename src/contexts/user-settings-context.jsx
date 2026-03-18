"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { USER_SETTINGS_DEFAULTS, mergeUserSettings } from "@/lib/user-settings";
import { formatMoney } from "@/lib/format-currency";

const UserSettingsContext = createContext({
  settings: USER_SETTINGS_DEFAULTS,
  loading: false,
  refresh: async () => {},
});

export function UserSettingsProvider({ children }) {
  const [settings, setSettings] = useState(USER_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard/settings", {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = await r.json();
      setSettings(mergeUserSettings(d.settings));
    } catch {
      setSettings(USER_SETTINGS_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, refresh }),
    [settings, loading, refresh]
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
}

/** Format money using the signed-in user’s Settings → Currency (default USD). */
export function useFormatMoney() {
  const { settings } = useUserSettings();
  const code =
    typeof settings?.currency === "string"
      ? settings.currency.toUpperCase().trim()
      : "USD";
  return useCallback((value) => formatMoney(value, code || "USD"), [code]);
}
