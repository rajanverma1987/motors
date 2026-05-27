import HelpIcon from "./help-icon";

/**
 * Range slider (theme accent-primary). Value is numeric via onChange event target.value.
 */
export default function Slider({
  label,
  help,
  id: idProp,
  name,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  disabled = false,
  className = "",
  /** Shown beside the label, e.g. "125%" */
  valueDisplay,
}) {
  const id = idProp ?? name;
  const numValue = Number(value);
  const safeValue = Number.isFinite(numValue) ? numValue : min;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label ? (
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={id}
            className={`inline-flex items-center gap-1.5 text-sm text-title ${disabled ? "opacity-70" : ""}`}
          >
            {label}
            <HelpIcon text={help} />
          </label>
          {valueDisplay != null && valueDisplay !== "" ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-title">{valueDisplay}</span>
          ) : null}
        </div>
      ) : null}
      <input
        id={id}
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        value={safeValue}
        disabled={disabled}
        onChange={onChange}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safeValue}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm"
      />
      <div className="flex justify-between text-xs text-secondary">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
