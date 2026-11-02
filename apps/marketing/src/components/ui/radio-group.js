import Radio from "./radio";
import HelpIcon from "./help-icon";

export default function RadioGroup({
  label,
  help,
  name,
  value,
  options = [],
  onChange,
  layout = "vertical",
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="inline-flex items-center gap-1.5 text-sm text-title">
          {label}
          <HelpIcon text={help} />
        </span>
      )}
      <div
        className={
          layout === "horizontal"
            ? "flex flex-wrap gap-6"
            : "flex flex-col gap-3"
        }
      >
        {options.map((opt, i) => (
          <Radio
            key={i}
            name={name}
            value={opt.value}
            label={opt.label}
            checked={value === opt.value}
            onChange={onChange}
            disabled={opt.disabled}
          />
        ))}
      </div>
    </div>
  );
}
