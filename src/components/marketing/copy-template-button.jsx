"use client";

import { useState } from "react";

/**
 * Copies a plain-text template to the clipboard so a shop can paste it straight
 * into Word, Sheets, or their own form. Falls back silently when the Clipboard
 * API is unavailable (older browsers, non-secure origins) — the <pre> block on
 * the page is still selectable by hand.
 */
export default function CopyTemplateButton({ text, label = "Copy template" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-title transition-colors hover:border-primary/40 hover:text-primary"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
