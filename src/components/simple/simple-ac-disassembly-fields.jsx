"use client";

import { AC_DISASSEMBLY_VISUAL_STATUS_ROWS } from "@/lib/simple-datasheet-form";
import SimpleAcElectricalTestsFields from "@/components/simple/simple-ac-electrical-tests-fields";
import SimpleDoubleClickTextEditInput from "@/components/simple/simple-double-click-text-edit-input";

const INPUT =
  "h-7 w-[12.5rem] max-w-full shrink-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 dark:bg-primary/10";
const TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10";
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

function GoodBadRow({ name, label, value, onChange }) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-border/70 py-1.5 last:border-b-0">
      <span className="w-[8.5rem] shrink-0 text-xs font-bold text-title">{label}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1" role="radiogroup" aria-label={label}>
        {[
          { value: "good", label: "Good" },
          { value: "bad", label: "Bad" },
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
    </div>
  );
}

function boolChecked(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * AC Disassembly tab — layout aligned to documents/Disassembly.png.
 * Status checkboxes mirror Service Proposal job Status dropdown (two-way via props).
 */
export default function SimpleAcDisassemblyFields({
  values = {},
  onChange,
  statusOptions = [],
  statusValue = "",
  onStatusChange,
}) {
  const patch = (key, value) => onChange?.(key, value);
  const v = values || {};
  const statusOpts = Array.isArray(statusOptions) ? statusOptions : [];
  const currentStatus = String(statusValue || "").trim();
  const statusMatches = (optValue) =>
    currentStatus.toLowerCase() === String(optValue || "").trim().toLowerCase();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {/* Visual (50%) + Status (50%) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <fieldset className="min-w-0 rounded-sm border border-border px-3 py-2">
          <legend className="px-1 text-sm font-bold text-title">Visual Status</legend>
          <div className="flex flex-col">
            {AC_DISASSEMBLY_VISUAL_STATUS_ROWS.map((row) => (
              <GoodBadRow
                key={row.key}
                name={`acDisassemblyVisual_${row.key}`}
                label={row.label}
                value={v[row.key] ?? ""}
                onChange={(val) => patch(row.key, val)}
              />
            ))}
          </div>
          <div className="mt-2 flex min-w-0 flex-col gap-1">
            <span className="text-xs font-bold text-title">Notes</span>
            <textarea
              rows={3}
              value={v.visualStatusNotes ?? ""}
              onChange={(e) => patch("visualStatusNotes", e.target.value)}
              className={TEXTAREA}
              aria-label="Visual status notes"
            />
          </div>
        </fieldset>

        <fieldset className="min-w-0 rounded-sm border border-border px-3 py-2">
          <legend className="px-1 text-sm font-bold text-title">Status</legend>
          {statusOpts.length === 0 ? (
            <p className="text-xs text-secondary">No job statuses configured. Add them in Settings.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" role="group" aria-label="Job status">
              {statusOpts.map((opt) => {
                const value = String(opt.value || "").trim();
                const checked = statusMatches(value);
                return (
                  <label
                    key={value}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onStatusChange?.(checked ? "" : value)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {opt.label || value}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
      </div>

      {/* Intake */}
      <div className="flex flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <label className={LABEL}>Marked Motor Sides</label>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            {[
              { key: "markedMotorSidesF1", label: "F1" },
              { key: "markedMotorSidesF2", label: "F2" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-bold leading-none text-title"
              >
                <input
                  type="checkbox"
                  checked={boolChecked(v[opt.key])}
                  onChange={(e) => patch(opt.key, e.target.checked ? "true" : "false")}
                  className="h-3.5 w-3.5 shrink-0 accent-primary"
                />
                {opt.label}
              </label>
            ))}
            <textarea
              rows={2}
              value={v.markedMotorSidesNotes ?? ""}
              onChange={(e) => patch("markedMotorSidesNotes", e.target.value)}
              className={`${TEXTAREA} !h-[3.25rem] !min-h-[3.25rem] !w-80 !max-w-full !resize-none !leading-snug`}
              placeholder="Notes"
              aria-label="Marked motor sides notes"
            />
          </div>
        </div>
        <TextField label="Junction Box Location">
          <SimpleDoubleClickTextEditInput
            label="Junction Box Location"
            value={v.junctionBoxLocation ?? ""}
            onChange={(next) => patch("junctionBoxLocation", next)}
            className={INPUT}
          />
        </TextField>
        <WideField label="Incoming Notes">
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
          leftControl={
            <SimpleDoubleClickTextEditInput
              label="End Bell Fit DE"
              value={v.endBellFitDE ?? ""}
              onChange={(next) => patch("endBellFitDE", next)}
              className={INPUT}
            />
          }
          rightLabel="End Bell Fit ODE"
          rightControl={
            <SimpleDoubleClickTextEditInput
              label="End Bell Fit ODE"
              value={v.endBellFitODE ?? ""}
              onChange={(next) => patch("endBellFitODE", next)}
              className={INPUT}
            />
          }
        />
        <DeOdeRow
          leftLabel="Shaft Measurement DE"
          leftControl={
            <SimpleDoubleClickTextEditInput
              label="Shaft Measurement DE"
              value={v.rotorFitDE ?? ""}
              onChange={(next) => patch("rotorFitDE", next)}
              className={INPUT}
            />
          }
          rightLabel="Shaft Management ODE"
          rightControl={
            <SimpleDoubleClickTextEditInput
              label="Shaft Management ODE"
              value={v.rotorFitODE ?? ""}
              onChange={(next) => patch("rotorFitODE", next)}
              className={INPUT}
            />
          }
        />
        <DeOdeRow
          leftLabel="Shaft Runout"
          leftControl={
            <SimpleDoubleClickTextEditInput
              label="Shaft Runout"
              value={v.shaftRunout ?? ""}
              onChange={(next) => patch("shaftRunout", next)}
              className={INPUT}
            />
          }
        />
        <DeOdeRow
          leftLabel="Number Of Bearings DE"
          leftControl={
            <SimpleDoubleClickTextEditInput
              label="Number Of Bearings DE"
              value={v.numberOfBearingsDE ?? v.numberOfBearings ?? "0"}
              onChange={(next) => patch("numberOfBearingsDE", next)}
              className={INPUT}
            />
          }
          rightLabel="Number Of Bearings ODE"
          rightControl={
            <SimpleDoubleClickTextEditInput
              label="Number Of Bearings ODE"
              value={v.numberOfBearingsODE ?? "0"}
              onChange={(next) => patch("numberOfBearingsODE", next)}
              className={INPUT}
            />
          }
        />
        <DeOdeRow
          leftLabel="Bearing Size DE"
          leftControl={
            <SimpleDoubleClickTextEditInput
              label="Bearing Size DE"
              value={v.bearingSizeDE ?? ""}
              onChange={(next) => patch("bearingSizeDE", next)}
              className={INPUT}
            />
          }
          rightLabel="Bearing Size ODE"
          rightControl={
            <SimpleDoubleClickTextEditInput
              label="Bearing Size ODE"
              value={v.bearingSizeODE ?? ""}
              onChange={(next) => patch("bearingSizeODE", next)}
              className={INPUT}
            />
          }
        />
        <DeOdeRow
          leftLabel="Seal Size DE"
          leftControl={
            <SimpleDoubleClickTextEditInput
              label="Seal Size DE"
              value={v.sealSizeDE ?? ""}
              onChange={(next) => patch("sealSizeDE", next)}
              className={INPUT}
            />
          }
          rightLabel="Seal Size ODE"
          rightControl={
            <SimpleDoubleClickTextEditInput
              label="Seal Size ODE"
              value={v.sealSizeODE ?? ""}
              onChange={(next) => patch("sealSizeODE", next)}
              className={INPUT}
            />
          }
        />
      </div>

      <WideField label="Other Notes">
        <textarea rows={2} value={v.otherNotes ?? ""} onChange={(e) => patch("otherNotes", e.target.value)} className={TEXTAREA} />
      </WideField>

      <SimpleAcElectricalTestsFields
        values={v}
        onChange={patch}
        idPrefix="acDisassembly"
      />

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
