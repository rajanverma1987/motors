"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { preliminaryFieldDefs } from "@/lib/repair-flow-preliminary-fields";

/**
 * Preliminary inspection inputs in a responsive grid; fields depend on `component`.
 */
export default function RepairFlowPreliminaryFieldsGrid({ component, values, onFieldChange, disabled }) {
  const defs = preliminaryFieldDefs(component);
  const v = values || {};

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {defs.map((def) => {
        const val = v[def.key] ?? "";
        const ch = (e) => onFieldChange(def.key, e.target.value ?? "");
        return (
          <div key={def.key} className={`min-w-0 ${def.multiline ? "sm:col-span-2 lg:col-span-3" : ""}`}>
            {def.multiline ? (
              <Textarea
                label={def.label}
                value={val}
                onChange={ch}
                rows={def.rows ?? 2}
                disabled={disabled}
              />
            ) : (
              <Input label={def.label} value={val} onChange={ch} disabled={disabled} />
            )}
          </div>
        );
      })}
    </div>
  );
}
