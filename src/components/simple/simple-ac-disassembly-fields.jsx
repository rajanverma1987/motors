"use client";

import {
  AC_DISASSEMBLY_STATUS_OPTIONS,
  AC_DISASSEMBLY_SURGE_FAILURE_KEYS,
} from "@/lib/simple-datasheet-form";

const INPUT =
  "h-7 w-[12.5rem] max-w-full shrink-0 rounded-sm border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 dark:bg-primary/10";
const TEXTAREA =
  "w-full min-w-0 resize-y rounded-sm border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10";
const LABEL = "w-[9.25rem] shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";

function TextField({ label, children, className = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <label className={LABEL}>{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function WideField({ label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <label className={`${LABEL} pt-1`}>{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DeOdeRow({ leftLabel, leftControl, rightLabel, rightControl }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
      <TextField label={leftLabel}>{leftControl}</TextField>
      {rightLabel ? <TextField label={rightLabel}>{rightControl}</TextField> : <div />}
    </div>
  );
}

function SectionBar({ children }) {
  return (
    <div className="mb-2 rounded-sm bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
      {children}
    </div>
  );
}

function ResultBox({ name, label, value, onChange }) {
  return (
    <div
      className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-border bg-card px-2.5 py-1"
      role="radiogroup"
      aria-label={label}
    >
      <span className="text-xs font-bold text-title">{label}</span>
      {[
        { value: "pass", label: "Pass" },
        { value: "fail", label: "Fail" },
      ].map((opt) => (
        <label key={opt.value} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-primary"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function boolChecked(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * AC Disassembly tab — layout aligned to documents/Disassembly.png.
 */
export default function SimpleAcDisassemblyFields({ values = {}, onChange }) {
  const patch = (key, value) => onChange?.(key, value);
  const v = values || {};

  return (
    <div className="flex max-w-[48rem] flex-col gap-4">
      {/* Visual + Status */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
        <fieldset className="rounded-sm border border-border px-3 py-2">
          <legend className="px-1 text-xs font-bold text-title">Visual Status</legend>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Visual status">
            {[
              { value: "good", label: "Visually Good" },
              { value: "burned", label: "Visually Burned" },
            ].map((opt) => (
              <label key={opt.value} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                <input
                  type="radio"
                  name="acDisassemblyVisual"
                  value={opt.value}
                  checked={v.visualStatus === opt.value}
                  onChange={() => patch("visualStatus", opt.value)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-sm border border-border px-3 py-2">
          <legend className="px-1 text-xs font-bold text-title">Status</legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Disassembly status">
            {AC_DISASSEMBLY_STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                <input
                  type="radio"
                  name="acDisassemblyStatus"
                  value={opt.value}
                  checked={v.status === opt.value}
                  onChange={() => patch("status", opt.value)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Intake */}
      <div className="flex flex-col gap-1.5">
        <TextField label="IncomingLeads">
          <input type="text" value={v.incomingLeads ?? ""} onChange={(e) => patch("incomingLeads", e.target.value)} className={INPUT} />
        </TextField>
        <TextField label="Marked Motor Sides">
          <input type="text" value={v.markedMotorSides ?? ""} onChange={(e) => patch("markedMotorSides", e.target.value)} className={INPUT} />
        </TextField>
        <TextField label="Junction Box Location">
          <input type="text" value={v.junctionBoxLocation ?? ""} onChange={(e) => patch("junctionBoxLocation", e.target.value)} className={INPUT} />
        </TextField>
        <WideField label="Broken Parts Notes">
          <textarea rows={2} value={v.brokenPartsNotes ?? ""} onChange={(e) => patch("brokenPartsNotes", e.target.value)} className={TEXTAREA} />
        </WideField>
      </div>

      {/* Fits & bearings — DE | ODE */}
      <div className="flex flex-col gap-1.5 rounded-sm border border-border/80 bg-primary/[0.02] p-3 dark:bg-primary/5">
        <div className="mb-1 hidden grid-cols-2 gap-x-8 sm:grid">
          <p className="pl-[9.25rem] text-[10px] font-semibold uppercase tracking-wide text-secondary">Drive end (DE)</p>
          <p className="pl-[9.25rem] text-[10px] font-semibold uppercase tracking-wide text-secondary">Opposite drive end (ODE)</p>
        </div>
        <DeOdeRow
          leftLabel="End Bell Fit DE"
          leftControl={<input type="text" value={v.endBellFitDE ?? ""} onChange={(e) => patch("endBellFitDE", e.target.value)} className={INPUT} />}
          rightLabel="End Bell Fit ODE"
          rightControl={<input type="text" value={v.endBellFitODE ?? ""} onChange={(e) => patch("endBellFitODE", e.target.value)} className={INPUT} />}
        />
        <DeOdeRow
          leftLabel="Rotor Fit DE"
          leftControl={<input type="text" value={v.rotorFitDE ?? ""} onChange={(e) => patch("rotorFitDE", e.target.value)} className={INPUT} />}
          rightLabel="Rotor Fit ODE"
          rightControl={<input type="text" value={v.rotorFitODE ?? ""} onChange={(e) => patch("rotorFitODE", e.target.value)} className={INPUT} />}
        />
        <DeOdeRow
          leftLabel="Shaft Measurement"
          leftControl={<input type="text" value={v.shaftMeasurement ?? ""} onChange={(e) => patch("shaftMeasurement", e.target.value)} className={INPUT} />}
          rightLabel="Shaft Runout"
          rightControl={<input type="text" value={v.shaftRunout ?? ""} onChange={(e) => patch("shaftRunout", e.target.value)} className={INPUT} />}
        />
        <DeOdeRow
          leftLabel="Number Of Bearings"
          leftControl={<input type="text" value={v.numberOfBearings ?? "0"} onChange={(e) => patch("numberOfBearings", e.target.value)} className={INPUT} />}
        />
        <DeOdeRow
          leftLabel="Bearing Size DE"
          leftControl={<input type="text" value={v.bearingSizeDE ?? ""} onChange={(e) => patch("bearingSizeDE", e.target.value)} className={INPUT} />}
          rightLabel="Bearing Size ODE"
          rightControl={<input type="text" value={v.bearingSizeODE ?? ""} onChange={(e) => patch("bearingSizeODE", e.target.value)} className={INPUT} />}
        />
        <DeOdeRow
          leftLabel="Seal Size DE"
          leftControl={<input type="text" value={v.sealSizeDE ?? ""} onChange={(e) => patch("sealSizeDE", e.target.value)} className={INPUT} />}
          rightLabel="Seal Size ODE"
          rightControl={<input type="text" value={v.sealSizeODE ?? ""} onChange={(e) => patch("sealSizeODE", e.target.value)} className={INPUT} />}
        />
      </div>

      <WideField label="Other Notes">
        <textarea rows={2} value={v.otherNotes ?? ""} onChange={(e) => patch("otherNotes", e.target.value)} className={TEXTAREA} />
      </WideField>

      {/* Magger */}
      <div>
        <SectionBar>Magger Test</SectionBar>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <TextField label="Magger Voltage">
            <input type="text" value={v.maggerVoltage ?? "0"} onChange={(e) => patch("maggerVoltage", e.target.value)} className={INPUT} />
          </TextField>
          <TextField label="Magger Micro Amps">
            <input type="text" value={v.maggerMicroAmps ?? "0"} onChange={(e) => patch("maggerMicroAmps", e.target.value)} className={INPUT} />
          </TextField>
          <ResultBox
            name="acDisassemblyMagger"
            label="Magger Test"
            value={v.maggerTest ?? ""}
            onChange={(val) => patch("maggerTest", val)}
          />
        </div>
      </div>

      {/* Surge */}
      <div>
        <SectionBar>Surge Test</SectionBar>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <TextField label="Surge Voltage">
            <input type="text" value={v.surgeVoltage ?? "0"} onChange={(e) => patch("surgeVoltage", e.target.value)} className={INPUT} />
          </TextField>
          <ResultBox
            name="acDisassemblySurge"
            label="SurgeTest"
            value={v.surgeTest ?? ""}
            onChange={(val) => patch("surgeTest", val)}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => (
            <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
              <input
                type="checkbox"
                checked={boolChecked(v[key])}
                onChange={(e) => patch(key, e.target.checked ? "true" : "false")}
                className="h-3.5 w-3.5 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-bold text-title">Final Notes:</span>
        <textarea
          rows={4}
          value={v.finalNotes ?? ""}
          onChange={(e) => patch("finalNotes", e.target.value)}
          className={TEXTAREA}
          aria-label="Final notes"
        />
      </div>
    </div>
  );
}
