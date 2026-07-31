"use client";

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

function boolChecked(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * AC Assembly tab fields (documents/Assembly.png) — Simple dense layout.
 */
export default function SimpleAcAssemblyFields({ values = {}, onChange }) {
  const patch = (key, value) => onChange?.(key, value);
  const v = values || {};

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <FieldRow label="Voltage Test" labelWidth="8rem">
          <input
            type="text"
            value={v.voltageTest ?? ""}
            onChange={(e) => patch("voltageTest", e.target.value)}
            className={FIELD_INPUT}
          />
        </FieldRow>
        <FieldRow label="RPM" labelWidth="8.5rem">
          <input type="text" value={v.rpm ?? ""} onChange={(e) => patch("rpm", e.target.value)} className={FIELD_INPUT} />
        </FieldRow>
      </div>

      <div>
        <p className={SECTION_TITLE}>Amps:</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <FieldRow label="Lead1 Amp" labelWidth="8rem">
            <input
              type="text"
              value={v.lead1Amp ?? ""}
              onChange={(e) => patch("lead1Amp", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Lead2 Amp" labelWidth="8.5rem">
            <input
              type="text"
              value={v.lead2Amp ?? ""}
              onChange={(e) => patch("lead2Amp", e.target.value)}
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Lead3 Amp" labelWidth="8rem">
            <input
              type="text"
              value={v.lead3Amp ?? ""}
              onChange={(e) => patch("lead3Amp", e.target.value)}
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
          <input
            type="text"
            value={v.motorIncomingPaint ?? ""}
            onChange={(e) => patch("motorIncomingPaint", e.target.value)}
            className={FIELD_INPUT}
          />
        </FieldRow>
        <FieldRow label="Motor Outgoing Paint" labelWidth="9.5rem">
          <input
            type="text"
            value={v.motorOutgoingPaint ?? ""}
            onChange={(e) => patch("motorOutgoingPaint", e.target.value)}
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
          aria-label="Assembly notes"
        />
      </div>
    </div>
  );
}
