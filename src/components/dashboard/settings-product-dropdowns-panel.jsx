"use client";

import { useMemo, useState } from "react";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import {
  MAX_PRODUCT_DROPDOWN_OPTIONS,
  PRODUCT_DROPDOWN_DEFINITIONS,
  normalizeProductDropdowns,
} from "@/lib/product-dropdown-catalog";

function linesForKey(productDropdowns, key, fallback) {
  const raw = productDropdowns?.[key];
  if (Array.isArray(raw)) return raw.slice(0, MAX_PRODUCT_DROPDOWN_OPTIONS);
  return Array.isArray(fallback) ? fallback.slice(0, MAX_PRODUCT_DROPDOWN_OPTIONS) : [];
}

function initialEditorText(productDropdowns) {
  const key = "manner_of_transport_receiving";
  const lists = normalizeProductDropdowns(productDropdowns);
  const def = PRODUCT_DROPDOWN_DEFINITIONS[key];
  const fb = lists[key] || def?.defaults || [];
  return linesForKey(productDropdowns, key, fb).join("\n");
}

export default function SettingsProductDropdownsPanel({ draft, setDraft }) {
  const [selectedKey, setSelectedKey] = useState("manner_of_transport_receiving");
  /** Local string so blank lines from Enter survive until Save normalizes. */
  const [editorText, setEditorText] = useState(() => initialEditorText(draft?.productDropdowns));

  const lists = useMemo(
    () => normalizeProductDropdowns(draft?.productDropdowns),
    [draft?.productDropdowns]
  );

  const selectOptions = useMemo(
    () =>
      Object.values(PRODUCT_DROPDOWN_DEFINITIONS).map((d) => ({
        value: d.key,
        label: d.label,
      })),
    []
  );

  const selectedDef = PRODUCT_DROPDOWN_DEFINITIONS[selectedKey];

  const valueCount = String(editorText || "")
    .split("\n")
    .filter((l) => String(l).trim()).length;

  const loadKey = (key) => {
    const def = PRODUCT_DROPDOWN_DEFINITIONS[key];
    const fb = lists[key] || def?.defaults || [];
    const lines = linesForKey(draft?.productDropdowns, key, fb);
    setSelectedKey(key);
    setEditorText(lines.join("\n"));
  };

  const patchList = (key, lines) => {
    setDraft((prev) => {
      const prevLists =
        prev?.productDropdowns && typeof prev.productDropdowns === "object" && !Array.isArray(prev.productDropdowns)
          ? prev.productDropdowns
          : {};
      return {
        ...prev,
        productDropdowns: {
          ...prevLists,
          [key]: lines,
        },
      };
    });
  };

  const applyEditorText = (nextText) => {
    const lines = String(nextText || "").split("\n");
    const clipped =
      lines.length > MAX_PRODUCT_DROPDOWN_OPTIONS
        ? lines.slice(0, MAX_PRODUCT_DROPDOWN_OPTIONS)
        : lines;
    const clippedText = clipped.join("\n");
    setEditorText(clippedText);
    patchList(selectedKey, clipped);
    return clippedText;
  };

  return (
    <div className="flex flex-col gap-8 pb-4">
      <FormContainer>
        <FormSectionTitle as="h2">Product dropdowns</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Edit option lists used on forms across the product (transport, quote type, payment methods, and similar).
          Status values (quotes, jobs, invoices) are managed under <span className="font-medium text-title">Status</span>.
          Master lists (customers, vendors, inventory locations) live under their own sections.
        </p>
        <div className="max-w-md">
          <Select
            label="Select dropdown"
            options={selectOptions}
            value={selectedKey}
            onChange={(e) => loadKey(e.target.value || "manner_of_transport_receiving")}
            searchable={false}
          />
        </div>
      </FormContainer>

      {selectedDef ? (
        <FormContainer>
          <FormSectionTitle as="h2">{selectedDef.label}</FormSectionTitle>
          <p className="mb-4 text-sm text-secondary">{selectedDef.description}</p>
          <Textarea
            label="Options (one per line)"
            value={editorText}
            onChange={(e) => applyEditorText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.stopPropagation();
              const el = e.target;
              const start = typeof el.selectionStart === "number" ? el.selectionStart : editorText.length;
              const end = typeof el.selectionEnd === "number" ? el.selectionEnd : start;
              const next = `${editorText.slice(0, start)}\n${editorText.slice(end)}`;
              if (next.split("\n").length > MAX_PRODUCT_DROPDOWN_OPTIONS) return;
              applyEditorText(next);
              const cursor = Math.min(start + 1, next.length);
              requestAnimationFrame(() => {
                try {
                  el.setSelectionRange(cursor, cursor);
                } catch {
                  /* ignore */
                }
              });
            }}
            rows={12}
            placeholder={selectedDef.defaults.join("\n")}
          />
          <p className="mt-2 text-xs text-secondary">
            {valueCount} / {MAX_PRODUCT_DROPDOWN_OPTIONS} values. Click{" "}
            <span className="font-medium text-title">Save changes</span> when finished. Empty lines are removed on save.
          </p>
        </FormContainer>
      ) : null}
    </div>
  );
}
