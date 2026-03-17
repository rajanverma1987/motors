import HelpIcon from "./help-icon";

export default function Input({
  label,
  help,
  id: idProp,
  placeholder,
  value,
  onChange,
  type = "text",
  name,
  className = "",
  readOnly = false,
  disabled = false,
  required = false,
  maxLength,
}) {
  const id = idProp ?? name;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className={`inline-flex items-center gap-1.5 text-sm text-title ${disabled || readOnly ? "opacity-70" : ""}`}>
          {label}
          <HelpIcon text={help} />
        </label>
      )}
      <input
        id={id}
        type={type}
        name={name}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        className={`rounded-md border-[0.5px] border-border bg-bg px-3 py-2 text-text placeholder:text-sm placeholder:text-secondary focus:outline-none focus:ring-[0.5px] focus:ring-primary focus:border-primary/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-card disabled:border-border/80 ${disabled ? "!opacity-60 !cursor-not-allowed !bg-card dark:!bg-gray-800/70 !border-border dark:!border-gray-600 select-none" : ""} ${readOnly && !disabled ? "!opacity-60 !cursor-default !bg-card dark:!bg-gray-800/70 !border-border dark:!border-gray-600 select-none" : ""}`}
      />
    </div>
  );
}
