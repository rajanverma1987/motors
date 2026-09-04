"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  USER_SETTINGS_DEFAULTS,
  mergeUserSettings,
  resolveTablePageSize,
  getHiddenColumnKeysForTable,
  normalizeTableColumnVisibility,
} from "@/lib/user-settings";
import { formatMoney, formatMoneyAbbreviated } from "@/lib/format-currency";
import { formatDateForCurrency, formatDateTimeForCurrency } from "@/lib/format-date";

const UserSettingsContext = createContext({
  settings: USER_SETTINGS_DEFAULTS,
  loading: false,
  refresh: async () => {},
  applyLocalSettings: () => {},
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

  const applyLocalSettings = useCallback((patch) => {
    if (!patch || typeof patch !== "object") return;
    setSettings((prev) => mergeUserSettings({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ settings, loading, refresh, applyLocalSettings }),
    [settings, loading, refresh, applyLocalSettings]
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

/**
 * Seed settings without fetching /api/dashboard/settings (e.g. public customer portal).
 * @param {{ settings?: object, children: import("react").ReactNode }} props
 */
export function UserSettingsValueProvider({ settings, children }) {
  const value = useMemo(
    () => ({
      settings: mergeUserSettings(settings),
      loading: false,
      refresh: async () => {},
      applyLocalSettings: () => {},
    }),
    [settings]
  );
  return (
    <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>
  );
}

/**
 * Persist / load per-table column visibility (UserSettings.tableColumnVisibility).
 * @param {string} tableId Stable id e.g. "simple-customers"
 */
export function useTableColumnVisibility(tableId) {
  const { settings, applyLocalSettings } = useUserSettings();
  const id = String(tableId || "").trim();

  const hiddenColumnKeys = useMemo(
    () => (id ? getHiddenColumnKeysForTable(settings, id) : []),
    [settings, id]
  );

  const onColumnVisibilityChange = useCallback(
    async (hiddenKeys) => {
      if (!id) return;
      const cleaned = Array.isArray(hiddenKeys)
        ? [...new Set(hiddenKeys.map((k) => String(k ?? "").trim()).filter(Boolean))]
        : [];
      const nextMap = normalizeTableColumnVisibility({
        ...(settings?.tableColumnVisibility || {}),
        [id]: cleaned,
      });
      applyLocalSettings({ tableColumnVisibility: nextMap });
      try {
        const r = await fetch("/api/dashboard/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tableColumnVisibility: nextMap }),
        });
        if (!r.ok) return;
        const d = await r.json().catch(() => ({}));
        if (d.settings) {
          applyLocalSettings(mergeUserSettings(d.settings));
        }
      } catch {
        /* keep optimistic local state */
      }
    },
    [id, settings?.tableColumnVisibility, applyLocalSettings]
  );

  return {
    columnSettings: Boolean(id),
    hiddenColumnKeys,
    onColumnVisibilityChange,
  };
}

export function useCompactTables() {
  const { settings } = useUserSettings();
  return !!settings?.compactTables;
}

/**
 * Page size state seeded from Settings → Display → Rows per page.
 * Stays in sync when the preference changes; still overridable via setPageSize (table footer).
 * @returns {[number, (n: number) => void]}
 */
export function usePreferredTablePageSize() {
  const { settings } = useUserSettings();
  const preferred = resolveTablePageSize(settings);
  const [pageSize, setPageSize] = useState(preferred);

  useEffect(() => {
    setPageSize((prev) => (prev === preferred ? prev : preferred));
  }, [preferred]);

  return [pageSize, setPageSize];
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

/** Compact currency for charts/KPIs ($1.2K, $3.4M). */
export function useFormatMoneyAbbreviated() {
  const { settings } = useUserSettings();
  const code =
    typeof settings?.currency === "string"
      ? settings.currency.toUpperCase().trim()
      : "USD";
  return useCallback((value) => formatMoneyAbbreviated(value, code || "USD"), [code]);
}

/** Format calendar dates using the country style for Settings → Currency (e.g. INR → dd/mm/yyyy). */
export function useFormatDate() {
  const { settings } = useUserSettings();
  const code =
    typeof settings?.currency === "string"
      ? settings.currency.toUpperCase().trim()
      : "USD";
  return useCallback((value) => formatDateForCurrency(value, code || "USD"), [code]);
}

/** Format date+time using the country style for Settings → Currency. */
export function useFormatDateTime() {
  const { settings } = useUserSettings();
  const code =
    typeof settings?.currency === "string"
      ? settings.currency.toUpperCase().trim()
      : "USD";
  return useCallback((value) => formatDateTimeForCurrency(value, code || "USD"), [code]);
}
