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
    <div className={`flex min-w-[12rem] flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-secondary">Background</span>
        <input
          type="color"
          value={bg}
          onChange={(e) => applyPatch({ tileBgColor: e.target.value })}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-card p-0.5"
          aria-label="Tile background color"
        />
        <Input
          value={bgColor}
          onChange={(e) => applyPatch({ tileBgColor: e.target.value })}
          placeholder="#e2e8f0"
          className="!gap-0 min-w-0 flex-1 font-mono text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-secondary">Text</span>
        <input
          type="color"
          value={text}
          onChange={(e) => applyPatch({ tileTextColor: e.target.value })}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-card p-0.5"
          aria-label="Tile text color"
        />
        <Input
          value={textColor}
          onChange={(e) => applyPatch({ tileTextColor: e.target.value })}
          placeholder="#1e293b"
          className="!gap-0 min-w-0 flex-1 font-mono text-xs"
        />
      </div>
      <button
        type="button"
        className="self-start text-xs text-secondary hover:text-primary"
        onClick={() => onChange?.({ tileBgColor: "", tileTextColor: "", tileColor: "" })}
      >
        Auto (by position)
      </button>
    </div>
  );
}
