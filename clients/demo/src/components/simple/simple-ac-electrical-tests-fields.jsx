"use client";

import { AC_DISASSEMBLY_SURGE_FAILURE_KEYS } from "@/lib/simple-datasheet-form";
import SimpleDoubleClickTextEditInput from "@/components/simple/simple-double-click-text-edit-input";

const INPUT =
  "h-7 w-[12.5rem] max-w-full shrink-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 dark:bg-primary/10";
const LABEL = "w-[9.25rem] shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";

function TextField({ label, children }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label className={LABEL}>{label}</label>
      <div className="min-w-0">{children}</div>
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
 * Magger / High-pot / Surge test blocks — shared by Disassembly and Assembly tabs.
 */
export default function SimpleAcElectricalTestsFields({
  values = {},
  onChange,
  idPrefix = "acElectricalTests",
}) {
  const patch = (key, value) => onChange?.(key, value);
  const v = values || {};

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <SectionBar>Magger Test</SectionBar>
          <div className="flex flex-col gap-2">
            <TextField label="Magger Voltage">
              <SimpleDoubleClickTextEditInput
                label="Magger Voltage"
                value={v.maggerVoltage ?? "0"}
                onChange={(next) => patch("maggerVoltage", next)}
                className={INPUT}
              />
            </TextField>
            <TextField label="Magger Readings">
              <SimpleDoubleClickTextEditInput
                label="Magger Readings"
                value={v.maggerMicroAmps ?? "0"}
                onChange={(next) => patch("maggerMicroAmps", next)}
                className={INPUT}
              />
            </TextField>
            <ResultBox
              name={`${idPrefix}Magger`}
              label="Magger Test"
              value={v.maggerTest ?? ""}
              onChange={(val) => patch("maggerTest", val)}
            />
          </div>
        </div>

        <div>
          <SectionBar>High-pot test</SectionBar>
          <div className="flex flex-col gap-2">
            <TextField label="High-pot Voltage">
              <SimpleDoubleClickTextEditInput
                label="High-pot Voltage"
                value={v.highPotVoltage ?? "0"}
                onChange={(next) => patch("highPotVoltage", next)}
                className={INPUT}
              />
            </TextField>
            <TextField label="High-pot Micro Amps">
              <SimpleDoubleClickTextEditInput
                label="High-pot Micro Amps"
                value={v.highPotMicroAmps ?? "0"}
                onChange={(next) => patch("highPotMicroAmps", next)}
                className={INPUT}
              />
            </TextField>
            <ResultBox
              name={`${idPrefix}HighPot`}
              label="High-pot test"
              value={v.highPotTest ?? ""}
              onChange={(val) => patch("highPotTest", val)}
            />
          </div>
        </div>
      </div>

      <div>
        <SectionBar>Surge Test</SectionBar>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <TextField label="Surge Voltage">
            <SimpleDoubleClickTextEditInput
              label="Surge Voltage"
              value={v.surgeVoltage ?? "0"}
              onChange={(next) => patch("surgeVoltage", next)}
              className={INPUT}
            />
          </TextField>
          <div className="flex items-center">
            <ResultBox
              name={`${idPrefix}Surge`}
              label="SurgeTest"
              value={v.surgeTest ?? ""}
              onChange={(val) => patch("surgeTest", val)}
            />
          </div>
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
    </div>
  );
}
