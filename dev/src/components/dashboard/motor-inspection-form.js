"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import {
  MOTOR_INSPECTION_FIELD_DEFS,
  PASS_FAIL_OPTIONS,
  SURGE_FAILURE_CHECKBOXES,
  VISUAL_STATUS_OPTIONS,
} from "@/lib/motor-inspection-fields";

function boolChecked(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function InspectionSection({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg/30 shadow-sm">
      <div className="border-b border-border/80 bg-card/50 px-4 py-3">
        <h4 className="text-sm font-semibold text-title">{title}</h4>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-secondary">{description}</p> : null}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function ChoicePills({ name, value, options, onChange, disabled, tone = "neutral" }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const active = value === opt.value;
        let activeClass = "border-primary bg-primary text-white shadow-sm";
        if (tone === "visual" && active) {
          activeClass =
            opt.value === "burned"
              ? "border-danger bg-danger text-white shadow-sm"
              : "border-success bg-success text-white shadow-sm";
        }
        if (tone === "passfail" && active) {
          activeClass =
            opt.value === "fail"
              ? "border-danger bg-danger text-white shadow-sm"
              : "border-success bg-success text-white shadow-sm";
        }
        return (
          <label
            key={opt.value}
            className={`inline-flex cursor-pointer items-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/50"
            } ${
              active
                ? activeClass
                : "border-border bg-form-bg text-title hover:bg-card"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              disabled={disabled}
              onChange={onChange}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

function DeOdeColumnHeaders() {
  return (
    <div className="mb-1 hidden gap-4 sm:grid sm:grid-cols-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Drive end (DE)</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Opposite drive end (ODE)
      </span>
    </div>
  );
}

/**
 * Shared motor inspection form (pre-inspection and detailed inspection).
 */
export default function MotorInspectionForm({
  formId,
  values,
  onChange,
  onSubmit,
  disabled = false,
  namePrefix = "motor-insp",
}) {
  const set = (key, value) => onChange(key, value);

  const fieldByKey = Object.fromEntries(MOTOR_INSPECTION_FIELD_DEFS.map((d) => [d.key, d]));

  function renderField(key, className = "") {
    const def = fieldByKey[key];
    if (!def) return null;
    const common = {
      label: def.label,
      value: values[key] ?? "",
      disabled,
      onChange: (e) => set(key, e.target.value),
      className,
    };
    if (def.multiline) {
      return <Textarea key={key} {...common} rows={def.rows ?? 3} />;
    }
    return (
      <Input
        key={key}
        {...common}
        type={def.type === "number" ? "number" : "text"}
        step={def.type === "number" ? "any" : undefined}
      />
    );
  }

  function renderDeOdeRow(leftKey, rightKey) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>{renderField(leftKey)}</div>
        <div>{renderField(rightKey)}</div>
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <InspectionSection
        title="Visual status"
        description="Overall visual condition before teardown."
      >
        <ChoicePills
          name={`${namePrefix}-visual`}
          value={values.visualStatus ?? ""}
          options={VISUAL_STATUS_OPTIONS}
          onChange={(e) => set("visualStatus", e.target.value)}
          disabled={disabled}
          tone="visual"
        />
      </InspectionSection>

      <InspectionSection
        title="Intake & condition"
        description="What arrived with the motor and visible damage notes."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderField("incomingLeads")}
          {renderField("markedMotorSides")}
          {renderField("junctionBoxLocation")}
          <div className="md:col-span-2">{renderField("brokenPartsNotes")}</div>
        </div>
      </InspectionSection>

      <InspectionSection
        title="Fit & bearings"
        description="Measurements and fits — enter DE and ODE pairs side by side."
      >
        <DeOdeColumnHeaders />
        <div className="space-y-4">
          {renderDeOdeRow("endBellFitDE", "endBellFitODE")}
          {renderDeOdeRow("rotorFitDE", "rotorFitODE")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {renderField("shaftMeasurement")}
            {renderField("shaftRunout")}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {renderField("numberOfBearings")}
            <div className="hidden sm:block" aria-hidden />
          </div>
          {renderDeOdeRow("bearingSizeDE", "bearingSizeODE")}
          {renderDeOdeRow("sealSizeDE", "sealSizeODE")}
        </div>
      </InspectionSection>

      <InspectionSection title="Other notes">
        {renderField("otherNotes")}
      </InspectionSection>

      <InspectionSection title="Magger test" description="Insulation resistance readings and result.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField("maggerVoltage")}
          {renderField("maggerMicroAmps")}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-secondary">Result</p>
          <ChoicePills
            name={`${namePrefix}-magger`}
            value={values.maggerTest ?? ""}
            options={PASS_FAIL_OPTIONS}
            onChange={(e) => set("maggerTest", e.target.value)}
            disabled={disabled}
            tone="passfail"
          />
        </div>
      </InspectionSection>

      <InspectionSection title="Surge test" description="Surge comparison and failure modes.">
        <div className="max-w-xs">{renderField("surgeVoltage")}</div>
        <div>
          <p className="mb-2 text-xs font-medium text-secondary">Result</p>
          <ChoicePills
            name={`${namePrefix}-surge`}
            value={values.surgeTest ?? ""}
            options={PASS_FAIL_OPTIONS}
            onChange={(e) => set("surgeTest", e.target.value)}
            disabled={disabled}
            tone="passfail"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-secondary">Surge failure modes</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SURGE_FAILURE_CHECKBOXES.map(({ key, label }) => {
              const checked = boolChecked(values[key]);
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    disabled ? "cursor-not-allowed opacity-50" : ""
                  } ${
                    checked
                      ? "border-primary/40 bg-primary/5 text-title"
                      : "border-border bg-form-bg text-title hover:border-primary/30 hover:bg-card"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => set(key, e.target.checked ? "true" : "false")}
                  />
                  <span className="leading-snug">{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </InspectionSection>

      <InspectionSection title="Final notes" description="Summary for quoting and shop floor.">
        {renderField("finalNotes")}
      </InspectionSection>
    </form>
  );
}
