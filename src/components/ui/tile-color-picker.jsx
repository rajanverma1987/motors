"use client";

import Input from "@/components/ui/input";
import { normalizeHexColor } from "@/lib/work-order-status-tiles";

/**
 * Background + text color pickers for status tiles (Settings → Dropdowns).
 */
export default function TileColorPicker({ bgColor = "", textColor = "", onChange, className = "" }) {
  const bg = normalizeHexColor(bgColor) || "#e2e8f0";
  const text = normalizeHexColor(textColor) || "#1e293b";

  const applyPatch = (next) => {
    onChange?.({
      tileBgColor: next.tileBgColor ?? bgColor,
      tileTextColor: next.tileTextColor ?? textColor,
      tileColor: "",
    });
  };

  return (
    <div className={`flex w-full min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-sm text-secondary">Background</span>
        <input
          type="color"
          value={bg}
          onChange={(e) => applyPatch({ tileBgColor: e.target.value })}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card p-0.5"
          aria-label="Tile background color"
        />
        <Input
          value={bgColor}
          onChange={(e) => applyPatch({ tileBgColor: e.target.value })}
          placeholder="#e2e8f0"
          className="!gap-0 min-w-0 flex-1"
          inputClassName="font-mono text-sm py-2.5"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-sm text-secondary">Text</span>
        <input
          type="color"
          value={text}
          onChange={(e) => applyPatch({ tileTextColor: e.target.value })}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-card p-0.5"
          aria-label="Tile text color"
        />
        <Input
          value={textColor}
          onChange={(e) => applyPatch({ tileTextColor: e.target.value })}
          placeholder="#1e293b"
          className="!gap-0 min-w-0 flex-1"
          inputClassName="font-mono text-sm py-2.5"
        />
      </div>
      <button
        type="button"
        className="self-start text-sm text-secondary hover:text-primary"
        onClick={() => onChange?.({ tileBgColor: "", tileTextColor: "", tileColor: "" })}
      >
        Auto (by position)
      </button>
    </div>
  );
}
