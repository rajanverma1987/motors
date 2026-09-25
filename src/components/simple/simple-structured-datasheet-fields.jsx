"use client";

import { GENERATOR_LOAD_TEST_KEYS } from "@/lib/simple-datasheet-extra";

const INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary/10";
const TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10";
const LABEL = "w-[11.5rem] shrink-0 text-right text-xs font-bold text-title";

function checked(v) {
  return String(v ?? "").trim().toLowerCase() === "true";
}

/**
 * Pump / Generator tab body. AC and DC keep their own field components.
 */
export default function SimpleStructuredDatasheetFields({ groups = [], values = {}, onChange }) {
  const v = values || {};
  const patch = (key, value) => onChange?.(key, value);

  const patchCheck = (key, nextChecked) => {
    const value = nextChecked ? "true" : "false";
    if (key === "loadTestPerformed" && !nextChecked) {
      onChange?.("loadTestPerformed", "false");
      for (const field of GENERATOR_LOAD_TEST_KEYS) onChange?.(field, "");
      return;
    }
    patch(key, value);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {groups.map((group) => {
        const gatedOff = group.whenKey && !checked(v[group.whenKey]);
        if (gatedOff) return null;
        return (
          <fieldset key={group.title} className="min-w-0 rounded-sm border border-border px-3 py-2">
            <legend className="px-1 text-sm font-bold text-title">{group.title}</legend>
            {group.type === "goodBad" ? (
              <div className="flex flex-col">
                {(group.rows || []).map((row) => (
                  <div key={row.key} className="flex min-w-0 items-center gap-3 border-b border-border/70 py-1.5 last:border-b-0">
                    <span className="w-[9.5rem] shrink-0 text-xs font-bold text-title">{row.label}</span>
                    <div className="flex flex-wrap gap-x-4" role="radiogroup" aria-label={row.label}>
                      {["good", "bad"].map((opt) => (
                        <label key={opt} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                          <input
                            type="radio"
                            name={row.key}
                            checked={String(v[row.key] || "") === opt}
                            onChange={() => patch(row.key, opt)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          {opt === "good" ? "Good" : "Bad"}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {group.type === "checks" ? (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {(group.items || []).map((item) => (
                  <label key={item.key} className="inline-flex items-center gap-2 text-xs font-bold text-title">
                    <input
                      type="checkbox"
                      checked={checked(v[item.key])}
                      onChange={(e) => patchCheck(item.key, e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            ) : null}
            {group.type === "fields" ? (
              <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
                {(group.fields || []).map(([key, label]) => (
                  <div key={key} className="flex min-w-0 items-center gap-2">
                    <label className={LABEL} htmlFor={`ds-${key}`}>
                      {label}
                    </label>
                    <input
                      id={`ds-${key}`}
                      type="text"
                      value={v[key] ?? ""}
                      onChange={(e) => patch(key, e.target.value)}
                      className={INPUT}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {group.type === "textarea" ? (
              <textarea
                rows={3}
                value={v[group.key] ?? ""}
                onChange={(e) => patch(group.key, e.target.value)}
                className={TEXTAREA}
                aria-label={group.label || group.title}
              />
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
