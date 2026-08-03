"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const STATUS_FILTER_CARD_VARIANTS = [
  { id: "strip", label: "Strip", hint: "Top accent + icon well" },
  { id: "rail", label: "Rail", hint: "Left color rail" },
  { id: "amount", label: "Amount", hint: "Dollar first" },
  { id: "split", label: "Split", hint: "Count panel on right" },
  { id: "soft", label: "Soft", hint: "Tinted wash" },
  { id: "ink", label: "Ink", hint: "Minimal type-led" },
];

export const STATUS_FILTER_CARD_STORAGE_KEY = "simple.statusFilterCardVariant";
const DEFAULT_VARIANT = "split";

const StatusFilterCardDesignContext = createContext({
  variant: DEFAULT_VARIANT,
  setVariant: () => {},
});

export function StatusFilterCardDesignProvider({ children }) {
  const [variant, setVariantState] = useState(DEFAULT_VARIANT);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STATUS_FILTER_CARD_STORAGE_KEY);
      if (STATUS_FILTER_CARD_VARIANTS.some((v) => v.id === saved)) {
        setVariantState(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setVariant = useCallback((next) => {
    if (!STATUS_FILTER_CARD_VARIANTS.some((v) => v.id === next)) return;
    setVariantState(next);
    try {
      window.localStorage.setItem(STATUS_FILTER_CARD_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ variant, setVariant }), [variant, setVariant]);

  return (
    <StatusFilterCardDesignContext.Provider value={value}>
      {children}
    </StatusFilterCardDesignContext.Provider>
  );
}

export function useStatusFilterCardDesign() {
  return useContext(StatusFilterCardDesignContext);
}

/** Temporary nav dropdown — preview summary filter card looks. */
export function StatusFilterCardDesignSelect({ className = "" }) {
  const { variant, setVariant } = useStatusFilterCardDesign();

  return (
    <label
      className={`inline-flex shrink-0 items-center gap-1.5 ${className}`.trim()}
      title="Temporary: preview summary filter card styles"
    >
      <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-secondary xl:inline">
        Cards
      </span>
      <select
        value={variant}
        onChange={(e) => setVariant(e.target.value)}
        className="h-9 max-w-[7.5rem] cursor-pointer border border-border bg-bg px-2 text-xs font-semibold text-title focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Summary filter card style preview"
      >
        {STATUS_FILTER_CARD_VARIANTS.map((v) => (
          <option key={v.id} value={v.id} title={v.hint}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}
