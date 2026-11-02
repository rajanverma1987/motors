import HelpIcon from "./help-icon";

export default function Radio({
  label,
  help,
  name,
  value,
  checked = false,
  onChange,
  disabled = false,
  className = "",
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 border-border bg-card accent-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
      />
      {label && (
        <span className="inline-flex items-center gap-1.5 text-sm text-title">
          {label}
          <HelpIcon text={help} />
        </span>
      )}
    </label>
  );
}
