"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import {
  DASHBOARD_PERIOD_PRESETS,
  getLocalDateRangeForPreset,
} from "@/lib/dashboard-period";

function toYMD(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {(range: { from: Date, to: Date } | null) => void} onRangeChange — null = all time
 * @param {string} [note] — optional note below buttons (e.g. dashboard AR hint)
 */
export default function DashboardPeriodFilter({ onRangeChange, note, className = "" }) {
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toYMD(d);
  });
  const [customTo, setCustomTo] = useState(() => toYMD(new Date()));

  const prevPreset = useRef(preset);

  const emitPreset = useCallback(() => {
    if (preset === "all") {
      onRangeChange?.(null);
      return;
    }
    if (preset === "custom") return;
    const r = getLocalDateRangeForPreset(preset);
    onRangeChange?.(r);
  }, [preset, onRangeChange]);

  useEffect(() => {
    if (preset !== "custom") emitPreset();
  }, [preset, emitPreset]);

  useEffect(() => {
    if (preset === "custom" && prevPreset.current !== "custom") {
      const r = getLocalDateRangeForPreset("custom", customFrom, customTo);
      if (r) onRangeChange?.(r);
    }
    prevPreset.current = preset;
  }, [preset, customFrom, customTo, onRangeChange]);

  const applyCustom = useCallback(() => {
    const r = getLocalDateRangeForPreset("custom", customFrom, customTo);
    if (r) onRangeChange?.(r);
  }, [customFrom, customTo, onRangeChange]);

  return (
    <div
      className={[
        "sticky top-0 z-30 -mx-4 mb-4 border-b border-border bg-bg/95 px-4 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-bg/90",
        className,
      ].join(" ")}
      role="group"
      aria-label="Period filter"
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Period</div>
      <div className="flex flex-wrap items-center gap-2">
        {DASHBOARD_PERIOD_PRESETS.map(({ id, label }) => {
          const active = preset === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPreset(id)}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "border-border bg-card text-title hover:border-primary/40 hover:bg-primary/5",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border/80 pt-3">
          <Input
            label="From"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-full min-w-[140px] sm:w-40"
          />
          <Input
            label="To"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-full min-w-[140px] sm:w-40"
          />
          <Button type="button" variant="primary" size="sm" onClick={applyCustom} className="shrink-0">
            Apply
          </Button>
        </div>
      )}

      {note ? <p className="mt-2 text-xs text-secondary">{note}</p> : null}
    </div>
  );
}
