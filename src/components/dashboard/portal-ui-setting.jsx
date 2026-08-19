"use client";

import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { normalizePortalUi, PORTAL_UI_CLASSIC, PORTAL_UI_SIMPLE } from "@/lib/portal-view";

const OPTIONS = [
  {
    value: PORTAL_UI_SIMPLE,
    label: "Basic",
    help: "Current workspace — denser screens under /dashboards.",
  },
  {
    value: PORTAL_UI_CLASSIC,
    label: "Classic",
    help: "Original dashboard with the sidebar under /dashboard.",
  },
];

/**
 * Shop-only toggle: Basic (Simple) vs Classic UI.
 */
export default function PortalUiSetting({ value, onChange, disabled = false }) {
  const current = normalizePortalUi(value);

  return (
    <FormContainer>
      <FormSectionTitle as="h2">Dashboard UI</FormSectionTitle>
      <p className="mb-4 text-sm text-secondary">
        Choose which workspace this shop uses. This applies only to your company, not to other
        IQMotorBase shops. Save changes to switch.
      </p>
      <div
        className="inline-flex max-w-full flex-wrap rounded-none border border-border bg-bg p-0.5"
        role="radiogroup"
        aria-label="Dashboard UI"
      >
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              title={opt.help}
              className={`rounded-none px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-card text-title shadow-sm" : "text-secondary hover:text-title"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              onClick={() => onChange?.(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-secondary">
        {current === PORTAL_UI_CLASSIC
          ? "Classic: original dashboard with sidebar navigation."
          : "Basic: current Simple workspace."}
      </p>
    </FormContainer>
  );
}
