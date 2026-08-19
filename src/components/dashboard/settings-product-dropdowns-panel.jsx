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

export default function SettingsProductDropdownsPanel({ draft, setDraft }) {
  const [selectedKey, setSelectedKey] = useState("manner_of_transport_receiving");

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
  const currentLines = lists[selectedKey] || selectedDef?.defaults || [];

  const patchList = (key, lines) => {
    setDraft((prev) => ({
      ...prev,
      productDropdowns: {
        ...normalizeProductDropdowns(prev?.productDropdowns),
        [key]: lines,
      },
    }));
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
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
            onChange={(e) => setSelectedKey(e.target.value || "manner_of_transport_receiving")}
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
            value={currentLines.join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").slice(0, MAX_PRODUCT_DROPDOWN_OPTIONS);
              patchList(selectedKey, lines);
            }}
            rows={12}
            placeholder={selectedDef.defaults.join("\n")}
          />
          <p className="mt-2 text-xs text-secondary">
            {currentLines.filter((l) => String(l).trim()).length} / {MAX_PRODUCT_DROPDOWN_OPTIONS} values. Click{" "}
            <span className="font-medium text-title">Save changes</span> when finished.
          </p>
        </FormContainer>
      ) : null}
    </div>
  );
}
