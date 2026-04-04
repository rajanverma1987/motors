"use client";

import { MOTOR_NAMEPLATE_FIELD_KEYS, MOTOR_NAMEPLATE_DISPLAY_LABELS } from "@/lib/motor-nameplate-patch";

/**
 * Read-only nameplate / motor details in a dense label grid (e.g. repair job modal).
 * @param {boolean} [compact] — tighter gaps and type for locked / modal intake view.
 */
export default function MotorNameplateCompactView({ values, compact = false }) {
  const v = values || {};
  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
          : "grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      }
    >
      {MOTOR_NAMEPLATE_FIELD_KEYS.map((key) => {
        const raw = v[key];
        const text = raw != null && String(raw).trim() ? String(raw) : "—";
        const label = MOTOR_NAMEPLATE_DISPLAY_LABELS[key] || key;
        return (
          <div key={key} className="min-w-0">
            <div
              className={
                compact
                  ? "text-[9px] font-semibold uppercase tracking-wide text-secondary leading-tight"
                  : "text-[10px] font-semibold uppercase tracking-wide text-secondary"
              }
            >
              {label}
            </div>
            <div
              className={
                compact
                  ? "truncate text-xs font-medium leading-tight text-title"
                  : "truncate text-sm font-medium text-title"
              }
              title={text === "—" ? undefined : text}
            >
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
