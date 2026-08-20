"use client";

import SimpleAcElectricalTestsFields from "@/components/simple/simple-ac-electrical-tests-fields";
import SimpleDoubleClickTextEditInput from "@/components/simple/simple-double-click-text-edit-input";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

function FieldRow({ label, labelWidth = "9rem", children, className = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
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

function boolChecked(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * AC Assembly tab fields (documents/Assembly.png) — Simple dense layout.
 * Magger / High-pot / Surge at top are stored on the assembly record (separate from Disassembly).
 */
export default function SimpleAcAssemblyFields({ values = {}, onChange }) {
  const patch = (key, value) => onChange?.(key, value);
  const v = values || {};

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <SimpleAcElectricalTestsFields
        values={v}
        onChange={patch}
        idPrefix="acAssembly"
      />

      <div>
        <SectionBar>Test Runs</SectionBar>
        <div className="flex flex-col gap-3 rounded-sm border border-border px-3 py-3">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <FieldRow label="Run Voltage Test" labelWidth="8rem">
              <SimpleDoubleClickTextEditInput
                label="Run Voltage Test"
                value={v.voltageTest ?? ""}
                onChange={(next) => patch("voltageTest", next)}
                className={FIELD_INPUT}
              />
            </FieldRow>
            <FieldRow label="RPM" labelWidth="8.5rem">
              <SimpleDoubleClickTextEditInput
                label="RPM"
                value={v.rpm ?? ""}
                onChange={(next) => patch("rpm", next)}
                className={FIELD_INPUT}
              />
            </FieldRow>
          </div>

          <div>
            <p className={SECTION_TITLE}>Amps:</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <FieldRow label="Lead1 Amp" labelWidth="8rem">
                <SimpleDoubleClickTextEditInput
                  label="Lead1 Amp"
                  value={v.lead1Amp ?? ""}
                  onChange={(next) => patch("lead1Amp", next)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Lead2 Amp" labelWidth="8.5rem">
                <SimpleDoubleClickTextEditInput
                  label="Lead2 Amp"
                  value={v.lead2Amp ?? ""}
                  onChange={(next) => patch("lead2Amp", next)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Lead3 Amp" labelWidth="8rem">
                <SimpleDoubleClickTextEditInput
                  label="Lead3 Amp"
                  value={v.lead3Amp ?? ""}
                  onChange={(next) => patch("lead3Amp", next)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
            <input
              type="checkbox"
              checked={boolChecked(v.paintAndPreparedToShip)}
              onChange={(e) => patch("paintAndPreparedToShip", e.target.checked ? "true" : "false")}
              className="h-3.5 w-3.5 accent-primary"
            />
            Paint And Prepared To Ship
          </label>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <FieldRow label="Motor Incoming Paint" labelWidth="9.5rem">
              <SimpleDoubleClickTextEditInput
                label="Motor Incoming Paint"
                value={v.motorIncomingPaint ?? ""}
                onChange={(next) => patch("motorIncomingPaint", next)}
                className={FIELD_INPUT}
              />
            </FieldRow>
            <FieldRow label="Motor Outgoing Paint" labelWidth="9.5rem">
              <SimpleDoubleClickTextEditInput
                label="Motor Outgoing Paint"
                value={v.motorOutgoingPaint ?? ""}
                onChange={(next) => patch("motorOutgoingPaint", next)}
                className={FIELD_INPUT}
              />
            </FieldRow>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-bold text-title">Notes:</span>
            <textarea
              rows={5}
              value={v.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value)}
              className={FIELD_TEXTAREA}
              aria-label="Test runs notes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
